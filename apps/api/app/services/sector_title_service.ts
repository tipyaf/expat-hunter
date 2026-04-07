/**
 * SectorTitleService — Returns target job titles for a sector+country.
 *
 * Resolution chain (cheapest first):
 * 1. DB cache (EntityType: 'sector', TTL 30 days)
 * 2. StaticTitleProvider (data/sector-titles.yaml via SectorRegistry)
 * 3. OpenRouterTitleProvider (GPT-4o-mini, ~$0.001/call)
 *
 * The provider is agnostic — swap OpenRouter for any LLM via TitleGenerationProvider.
 */
import ExternalCache from '#models/external_cache'
import OpenRouterClient from '#ai/openrouter_client'
import { sectorRegistry } from '#services/sector_registry'
import { DateTime } from 'luxon'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SectorTitles {
  primary: string[]
  secondary: string[]
  hr_talent: string[]
  exclude: string[]
}

export interface TitleGenerationProvider {
  readonly providerName: string
  generateTitles(sector: string, country: string): Promise<SectorTitles>
}

// ---------------------------------------------------------------------------
// StaticTitleProvider — reads from SectorRegistry (backed by sector-titles.yaml)
// ---------------------------------------------------------------------------

export class StaticTitleProvider implements TitleGenerationProvider {
  readonly providerName = 'static'

  generateTitles(sector: string, _country: string): Promise<SectorTitles> {
    const config = sectorRegistry.getConfigOrDefault(sector)
    return Promise.resolve({
      primary: config.roleWhitelist.slice(0, 20),
      secondary: config.roleWhitelist.slice(20),
      hr_talent: [],
      exclude: config.roleBlacklist,
    })
  }
}

// ---------------------------------------------------------------------------
// OpenRouterTitleProvider — GPT-4o-mini fallback for unknown sectors
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT_PATH = resolve(process.cwd(), '../../data/sector-titles-prompt.md')

function loadSystemPrompt(): string {
  try {
    const raw = readFileSync(SYSTEM_PROMPT_PATH, 'utf-8')
    const match = raw.match(/## System Prompt.*?```\n([\s\S]*?)```/m)
    return match ? match[1].trim() : ''
  } catch {
    return ''
  }
}

export class OpenRouterTitleProvider implements TitleGenerationProvider {
  readonly providerName = 'llm:gpt-4o-mini'
  private readonly systemPrompt = loadSystemPrompt()

  async generateTitles(sector: string, country: string): Promise<SectorTitles> {
    const client = new OpenRouterClient({ model: 'openai/gpt-4o-mini', maxTokens: 1024 })

    if (!client.isConfigured) {
      throw new Error('OpenRouter not configured')
    }

    const userPrompt = `Generate a list of job titles for the hidden job market in the following context:

Sector: ${sector}
Country/Culture: ${country}
Language for titles: English
Number of titles per level: 10

Return ONLY a JSON object with keys: primary (array), secondary (array), hr_talent (array), exclude (array). No markdown.`

    const raw = await client.chat({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      maxTokens: 1024,
    })

    const parsed = JSON.parse(raw) as { titles?: SectorTitles } | SectorTitles
    const titles = 'titles' in parsed && parsed.titles ? parsed.titles : (parsed as SectorTitles)

    return {
      primary: Array.isArray(titles.primary) ? titles.primary : [],
      secondary: Array.isArray(titles.secondary) ? titles.secondary : [],
      hr_talent: Array.isArray(titles.hr_talent) ? titles.hr_talent : [],
      exclude: Array.isArray(titles.exclude) ? titles.exclude : [],
    }
  }
}

// ---------------------------------------------------------------------------
// SectorTitleService — orchestrates cache + providers
// ---------------------------------------------------------------------------

const CACHE_SOURCE = 'sector_titles'
const CACHE_TTL_DAYS = 30

export default class SectorTitleService {
  private readonly llmProvider: TitleGenerationProvider
  private readonly staticProvider: TitleGenerationProvider

  constructor(llmProvider?: TitleGenerationProvider) {
    this.staticProvider = new StaticTitleProvider()
    this.llmProvider = llmProvider ?? new OpenRouterTitleProvider()
  }

  /**
   * Get target titles for sector+country.
   * Chain: cache → static (known sectors) → LLM (unknown sectors) → static fallback
   */
  async getTitles(sector: string, country: string): Promise<SectorTitles & { source: string }> {
    const cacheKey = `${sector.toLowerCase()}:${country.toLowerCase()}`

    // 1. DB cache
    const cached = await this.fromCache(cacheKey)
    if (cached) return { ...cached, source: 'cache' }

    // 2. Static for known sectors
    const isKnown = sectorRegistry.getConfig(sector) !== undefined
    if (isKnown) {
      const titles = await this.staticProvider.generateTitles(sector, country)
      await this.saveToCache(cacheKey, titles, 'static')
      return { ...titles, source: 'static' }
    }

    // 3. LLM for unknown sectors
    try {
      const titles = await this.llmProvider.generateTitles(sector, country)
      await this.saveToCache(cacheKey, titles, this.llmProvider.providerName)
      return { ...titles, source: this.llmProvider.providerName }
    } catch {
      // 4. Static fallback if LLM fails
      const titles = await this.staticProvider.generateTitles(sector, country)
      await this.saveToCache(cacheKey, titles, 'static:fallback', 7)
      return { ...titles, source: 'static:fallback' }
    }
  }

  /**
   * Get combined primary + secondary titles (for Hunter domain search filter).
   * Optionally include HR titles.
   */
  async getFlatTitles(sector: string, country: string, includeHr = false): Promise<string[]> {
    const { primary, secondary, hr_talent } = await this.getTitles(sector, country)
    return [...primary, ...secondary, ...(includeHr ? hr_talent : [])]
  }

  private async fromCache(cacheKey: string): Promise<SectorTitles | null> {
    const cached = await ExternalCache.query()
      .where('source', CACHE_SOURCE)
      .where('entityType', 'market')
      .where('entityKey', cacheKey)
      .first()

    if (!cached || cached.isExpired) return null

    const data = cached.data as Record<string, unknown>
    return {
      primary: (data.primary as string[]) ?? [],
      secondary: (data.secondary as string[]) ?? [],
      hr_talent: (data.hr_talent as string[]) ?? [],
      exclude: (data.exclude as string[]) ?? [],
    }
  }

  private async saveToCache(
    cacheKey: string,
    titles: SectorTitles,
    generatedBy: string,
    ttlDays = CACHE_TTL_DAYS
  ): Promise<void> {
    const now = DateTime.now()
    const existing = await ExternalCache.query()
      .where('source', CACHE_SOURCE)
      .where('entityType', 'market')
      .where('entityKey', cacheKey)
      .first()

    const data = { ...titles, generatedBy }

    if (existing) {
      existing.data = data
      existing.fetchedAt = now
      existing.expiresAt = now.plus({ days: ttlDays })
      await existing.save()
    } else {
      await ExternalCache.create({
        source: CACHE_SOURCE,
        entityType: 'market',
        entityKey: cacheKey,
        data,
        fetchedAt: now,
        expiresAt: now.plus({ days: ttlDays }),
      })
    }
  }
}
