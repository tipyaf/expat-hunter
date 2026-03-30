/**
 * ContextEnrichmentService — Collects rich company context for personalized outreach.
 *
 * Sources (cheapest first):
 * 1. Website About page → LLM parse (culture, tech stack, expat signals)
 * 2. Seek/job postings already in DB → hiring signals
 * 3. Hunter Company Enrichment API (1 credit, cache 30d)
 *
 * Stores result in company.contextData (JSONB).
 */
import CacheService from '#services/cache_service'
import OpenRouterClient from '#ai/openrouter_client'
import env from '#start/env'
import { AI_MAX_TOKENS_SHORT } from '../constants/ai.js'

export interface CompanyContextData {
  culture: string | null
  techStack: string[]
  recentNews: NewsItem[]
  hiringSignals: HiringSignals
  expatFriendlySignals: string[]
  aboutSummary: string | null
  dataQuality: 'high' | 'medium' | 'low'
  sources: string[]
}

export interface NewsItem {
  title: string
  date: string
  url: string
}

export interface HiringSignals {
  isHiring: boolean
  openRolesCount: number
  techRolesCount: number
  lastJobDate: string | null
}

const ABOUT_PATHS = ['/about', '/about-us', '/company', '/our-story', '/who-we-are']
const ABOUT_PARSE_PROMPT = `Analyze this company "About" page content and extract:
1. culture: A 2-3 sentence summary of the company culture and values
2. techStack: Array of technologies mentioned (programming languages, frameworks, tools)
3. expatFriendlySignals: Array of signals that the company is expat-friendly (e.g., "mentions international team", "content in English", "mentions relocation")
4. aboutSummary: A 2-3 sentence factual summary of what the company does

Return ONLY valid JSON with keys: culture, techStack, expatFriendlySignals, aboutSummary. No markdown.`

export default class ContextEnrichmentService {
  private cache = new CacheService()
  private hunterApiKey = env.get('HUNTER_API_KEY')

  /**
   * Enrich a company with contextual data from multiple sources.
   */
  async enrich(domain: string, companyName: string): Promise<CompanyContextData> {
    const sources: string[] = []
    let culture: string | null = null
    let techStack: string[] = []
    let expatFriendlySignals: string[] = []
    let aboutSummary: string | null = null
    const recentNews: NewsItem[] = []

    // Source 1 — Website About page
    const aboutData = await this.fetchAndParseAboutPage(domain)
    if (aboutData) {
      culture = aboutData.culture
      techStack = aboutData.techStack ?? []
      expatFriendlySignals = aboutData.expatFriendlySignals ?? []
      aboutSummary = aboutData.aboutSummary
      sources.push('website')
    }

    // Source 2 — Hunter Company Enrichment
    const hunterData = await this.fetchHunterEnrichment(domain)
    if (hunterData) {
      if (hunterData.techStack?.length) {
        techStack = [...new Set([...techStack, ...hunterData.techStack])]
      }
      if (!aboutSummary && hunterData.description) {
        aboutSummary = hunterData.description
      }
      sources.push('hunter_enrichment')
    }

    // Determine data quality
    const fieldCount = [culture, techStack.length > 0, aboutSummary, expatFriendlySignals.length > 0]
      .filter(Boolean).length
    const dataQuality: CompanyContextData['dataQuality'] =
      fieldCount >= 3 ? 'high' : fieldCount >= 1 ? 'medium' : 'low'

    return {
      culture,
      techStack,
      recentNews,
      hiringSignals: { isHiring: false, openRolesCount: 0, techRolesCount: 0, lastJobDate: null },
      expatFriendlySignals,
      aboutSummary,
      dataQuality,
      sources,
    }
  }

  /**
   * Crawl About page and parse with LLM.
   */
  private async fetchAndParseAboutPage(domain: string): Promise<{
    culture: string | null
    techStack: string[]
    expatFriendlySignals: string[]
    aboutSummary: string | null
  } | null> {
    const cacheKey = `about:${domain}`

    try {
      const result = await this.cache.getOrFetch(
        'context_enrichment',
        'company',
        cacheKey,
        async () => {
          const html = await this.crawlAboutPage(domain)
          if (!html) return { culture: null, techStack: [], expatFriendlySignals: [], aboutSummary: null }
          return await this.parseWithLlm(html)
        },
        7
      )
      return result.data as { culture: string | null; techStack: string[]; expatFriendlySignals: string[]; aboutSummary: string | null }
    } catch {
      return null
    }
  }

  /**
   * Try common About page paths, return first successful HTML body.
   */
  private async crawlAboutPage(domain: string): Promise<string | null> {
    for (const path of ABOUT_PATHS) {
      try {
        const url = `https://${domain}${path}`
        const res = await fetch(url, {
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'ExpatHunter/1.0 (contact enrichment)' },
        })
        if (!res.ok) continue

        const html = await res.text()
        // Extract text content (strip HTML tags), limit to 3000 chars for LLM
        const text = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 3000)

        if (text.length > 100) return text
      } catch {
        continue
      }
    }
    return null
  }

  /**
   * Parse About page text with LLM (GPT-4o-mini via OpenRouter).
   */
  private async parseWithLlm(text: string): Promise<{
    culture: string | null
    techStack: string[]
    expatFriendlySignals: string[]
    aboutSummary: string | null
  }> {
    const client = new OpenRouterClient({ model: 'openai/gpt-4o-mini', maxTokens: AI_MAX_TOKENS_SHORT })
    if (!client.isConfigured) {
      return { culture: null, techStack: [], expatFriendlySignals: [], aboutSummary: null }
    }

    try {
      const raw = await client.chat({
        messages: [
          { role: 'system', content: ABOUT_PARSE_PROMPT },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
      })

      const parsed = JSON.parse(raw) as Record<string, unknown>
      return {
        culture: (parsed.culture as string) ?? null,
        techStack: Array.isArray(parsed.techStack) ? (parsed.techStack as string[]) : [],
        expatFriendlySignals: Array.isArray(parsed.expatFriendlySignals) ? (parsed.expatFriendlySignals as string[]) : [],
        aboutSummary: (parsed.aboutSummary as string) ?? null,
      }
    } catch {
      return { culture: null, techStack: [], expatFriendlySignals: [], aboutSummary: null }
    }
  }

  /**
   * Hunter Company Enrichment API.
   */
  private async fetchHunterEnrichment(domain: string): Promise<{
    description: string | null
    techStack: string[]
  } | null> {
    if (!this.hunterApiKey) return null

    const cacheKey = `hunter_company:${domain}`

    try {
      const result = await this.cache.getOrFetch(
        'hunter_enrichment',
        'company',
        cacheKey,
        async () => {
          const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${this.hunterApiKey}&type=personal&limit=0`
          const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
          if (!res.ok) return { description: null, techStack: [] }

          const json = (await res.json()) as {
            data?: {
              organization?: string
              description?: string
              technologies?: string[]
            }
          }

          return {
            description: json.data?.description ?? null,
            techStack: json.data?.technologies ?? [],
          }
        },
        30
      )
      return result.data as { description: string | null; techStack: string[] }
    } catch {
      return null
    }
  }
}
