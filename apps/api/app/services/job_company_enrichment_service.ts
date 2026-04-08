/**
 * JobCompanyEnrichmentService — Enrich job offers with company data via AI.
 *
 * For each unenriched offer: normalize company name to slug, check cache,
 * call OpenRouter AI for sector/size/type, cache result, check accreditation
 * for NZ/AU. Fail-open: AI errors never block the pipeline.
 */
import {
  CACHE_TTL_DAYS,
  DEDUP_RULES,
  ENRICHMENT_BATCH_SIZE,
  MAX_COMPANY_NAME_LENGTH,
} from '@expat-hunter/shared'
import type { CompanyType } from '@expat-hunter/shared'
import OpenRouterClient from '#ai/openrouter_client'
import CompanyCache from '#models/company_cache'
import AccreditationCache from '#models/accreditation_cache'
import JobOffer from '#models/job_offer'
import JobSearch from '#models/job_search'
import VisaSponsorRegistry from '#models/visa_sponsor_registry'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

const BATCH_DELAY_MS = 1000

const COUNTRY_SUFFIXES = ['nz', 'au', 'uk', 'us', 'usa']

const ACCREDITATION_COUNTRIES = ['NZ', 'AU']

const SKIP_NAMES = ['', 'n/a', 'na', 'unknown', 'confidential']

const VALID_COMPANY_TYPES: CompanyType[] = [
  'recruitment_agency',
  'hiring_company',
  'consulting',
  'unknown',
]

interface EnrichmentResult {
  enriched: number
  cached: number
  skipped: number
  errors: number
}

interface AIEnrichmentData {
  name: string
  sector: string | null
  size: string | null
  companyType: CompanyType
}

/**
 * Normalize a company name into a slug for cache dedup.
 * Lowercases, strips known company suffixes and country abbreviations,
 * removes special characters, collapses whitespace.
 */
export function normalizeSlug(companyName: string): string {
  if (!companyName) return ''

  let name = companyName.trim().toLowerCase()

  if (name.length > MAX_COMPANY_NAME_LENGTH) {
    name = name.slice(0, MAX_COMPANY_NAME_LENGTH)
  }

  // Remove special characters (keep alphanumeric and spaces)
  name = name.replace(/[^a-z0-9\s]/g, ' ')

  // Split into words, remove company suffixes and country abbreviations
  const allSuffixes = [...DEDUP_RULES.COMPANY_SUFFIXES, ...COUNTRY_SUFFIXES]
  const words = name
    .split(/\s+/)
    .filter((w) => w.length > 0 && !allSuffixes.includes(w))

  return words.join(' ').trim()
}

export default class JobCompanyEnrichmentService {
  private readonly client: OpenRouterClient

  constructor(client?: OpenRouterClient) {
    this.client = client ?? new OpenRouterClient()
  }

  /**
   * Enrich all unenriched offers for a search. Processes in batches of
   * ENRICHMENT_BATCH_SIZE with rate limiting between batches.
   */
  async enrichForSearch(searchId: string, userId: string): Promise<EnrichmentResult> {
    const result: EnrichmentResult = { enriched: 0, cached: 0, skipped: 0, errors: 0 }

    if (!this.client.isConfigured) {
      logger.warn({ searchId }, 'JobCompanyEnrichmentService: OpenRouter not configured, skipping')
      return result
    }

    // Verify ownership + get country
    const search = await JobSearch.query()
      .where('id', searchId)
      .where('userId', userId)
      .firstOrFail()

    const country = search.countries[0] ?? 'UNKNOWN'

    // Get unenriched offers with a company name
    const offers = await JobOffer.query()
      .where('searchId', searchId)
      .whereNull('companyCacheId')
      .whereIn('status', ['new', 'evaluated'])
      .whereNotNull('companyName')
      .orderBy('createdAt', 'asc')

    if (offers.length === 0) return result

    // Track slugs already processed in this batch (dedup within batch)
    const slugCache = new Map<string, string>() // "slug:country" → companyCacheId

    for (let i = 0; i < offers.length; i += ENRICHMENT_BATCH_SIZE) {
      const batch = offers.slice(i, i + ENRICHMENT_BATCH_SIZE)

      for (const offer of batch) {
        await this.enrichOffer(offer, country, result, slugCache)
      }

      // Rate limit between batches (skip delay after last batch)
      if (i + ENRICHMENT_BATCH_SIZE < offers.length) {
        await this.delay(BATCH_DELAY_MS)
      }
    }

    logger.info({ searchId, ...result }, 'JobCompanyEnrichmentService: enrichment completed')
    return result
  }

  /**
   * Enrich a single offer. Fail-open on any error.
   */
  private async enrichOffer(
    offer: JobOffer,
    country: string,
    result: EnrichmentResult,
    slugCache: Map<string, string>
  ): Promise<void> {
    try {
      const companyName = offer.companyName?.trim() ?? ''

      if (SKIP_NAMES.includes(companyName.toLowerCase())) {
        result.skipped++
        return
      }

      const slug = normalizeSlug(companyName)
      if (!slug) {
        result.skipped++
        return
      }

      const cacheKey = `${slug}:${country}`

      // Check batch dedup first
      const batchHit = slugCache.get(cacheKey)
      if (batchHit) {
        await this.linkOfferToCache(offer, batchHit)
        result.cached++
        return
      }

      // Check DB cache (non-expired)
      const cachedId = await this.findValidCache(slug, country)
      if (cachedId) {
        await this.linkOfferToCache(offer, cachedId)
        slugCache.set(cacheKey, cachedId)
        result.cached++
        return
      }

      // AI enrichment + upsert cache
      const cacheEntry = await this.enrichAndUpsertCache(companyName, slug, country)

      await this.linkOfferToCache(offer, cacheEntry.id)
      slugCache.set(cacheKey, cacheEntry.id)
      result.enriched++
    } catch (error) {
      result.errors++
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error(
        { offerId: offer.id, error: message },
        'JobCompanyEnrichmentService: enrichment failed, keeping offer unenriched'
      )
    }
  }

  /**
   * Link a job offer to a CompanyCache entry.
   */
  private async linkOfferToCache(offer: JobOffer, cacheId: string): Promise<void> {
    offer.companyCacheId = cacheId
    await offer.save()
  }

  /**
   * Find a valid (non-expired) cache entry by slug + country. Returns id or null.
   */
  private async findValidCache(slug: string, country: string): Promise<string | null> {
    const existing = await CompanyCache.query()
      .where('slug', slug)
      .where('country', country)
      .first()

    if (existing && existing.expiresAt > DateTime.now()) {
      return existing.id
    }
    return null
  }

  /**
   * Call AI to enrich company, then upsert the cache entry. Also checks accreditation for NZ/AU.
   */
  private async enrichAndUpsertCache(
    companyName: string,
    slug: string,
    country: string
  ): Promise<CompanyCache> {
    const aiData = await this.enrichCompanyViaAI(companyName, country)

    const existing = await CompanyCache.query()
      .where('slug', slug)
      .where('country', country)
      .first()

    const cacheEntry = existing
      ? await this.updateCacheEntry(existing, aiData)
      : await this.createCacheEntry(slug, country, aiData)

    if (ACCREDITATION_COUNTRIES.includes(country)) {
      await this.checkAndCacheAccreditation(slug, country)
    }

    return cacheEntry
  }

  /**
   * Update an existing (expired) cache entry with fresh AI data.
   */
  private async updateCacheEntry(existing: CompanyCache, aiData: AIEnrichmentData): Promise<CompanyCache> {
    existing.name = this.sanitize(aiData.name, MAX_COMPANY_NAME_LENGTH)
    existing.sector = aiData.sector ? this.sanitize(aiData.sector, MAX_COMPANY_NAME_LENGTH) : null
    existing.size = aiData.size ? this.sanitize(aiData.size, 100) : null
    existing.companyType = aiData.companyType
    existing.expiresAt = DateTime.now().plus({ days: CACHE_TTL_DAYS })
    await existing.save()
    return existing
  }

  /**
   * Create a new cache entry from AI data.
   */
  private async createCacheEntry(slug: string, country: string, aiData: AIEnrichmentData): Promise<CompanyCache> {
    return CompanyCache.create({
      slug,
      country,
      name: this.sanitize(aiData.name, MAX_COMPANY_NAME_LENGTH),
      sector: aiData.sector ? this.sanitize(aiData.sector, MAX_COMPANY_NAME_LENGTH) : null,
      size: aiData.size ? this.sanitize(aiData.size, 100) : null,
      companyType: aiData.companyType,
      expiresAt: DateTime.now().plus({ days: CACHE_TTL_DAYS }),
    })
  }

  /**
   * Call OpenRouter AI to classify a company.
   */
  async enrichCompanyViaAI(companyName: string, country: string): Promise<AIEnrichmentData> {
    const raw = await this.client.chat({
      messages: [
        {
          role: 'system',
          content: `You are a company intelligence expert. Given a company name and country, provide structured data about the company.

Respond ONLY with valid JSON (no markdown, no comments):
{
  "name": "<canonical company name>",
  "sector": "<industry sector or null>",
  "size": "<company size: startup, small, medium, large, enterprise, or null>",
  "companyType": "<one of: recruitment_agency, hiring_company, consulting, unknown>"
}

Rules:
- "name" = cleaned canonical name (no Ltd, Inc, etc.)
- "companyType" = classify accurately: recruitment agencies source candidates for other companies, hiring companies hire directly, consulting firms provide advisory/professional services
- If unsure about any field, use null (for sector/size) or "unknown" (for companyType)`,
        },
        {
          role: 'user',
          content: `Company: ${companyName}\nCountry: ${country}\n\nProvide company data.`,
        },
      ],
      temperature: 0.2,
      maxTokens: 256,
    })

    return this.parseAIResponse(raw, companyName)
  }

  /**
   * Parse AI response JSON, falling back to defaults on invalid input.
   */
  private parseAIResponse(raw: string, fallbackName: string): AIEnrichmentData {
    let cleaned = raw.trim()
    // Strip markdown code fences if present
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { name: fallbackName, sector: null, size: null, companyType: 'unknown' }
    }

    try {
      const parsed = JSON.parse(jsonMatch[0])

      const companyType: CompanyType = VALID_COMPANY_TYPES.includes(parsed.companyType)
        ? parsed.companyType
        : 'unknown'

      return {
        name: typeof parsed.name === 'string' && parsed.name.length > 0 ? parsed.name : fallbackName,
        sector: typeof parsed.sector === 'string' && parsed.sector.length > 0 ? parsed.sector : null,
        size: typeof parsed.size === 'string' && parsed.size.length > 0 ? parsed.size : null,
        companyType,
      }
    } catch {
      return { name: fallbackName, sector: null, size: null, companyType: 'unknown' }
    }
  }

  /**
   * Check and cache accreditation status for NZ/AU companies
   * by looking up the visa_sponsor_registry.
   */
  private async checkAndCacheAccreditation(slug: string, country: string): Promise<void> {
    // Check if already cached
    const existing = await AccreditationCache.query()
      .where('slug', slug)
      .where('country', country)
      .first()

    if (existing) return

    // Lookup in visa sponsor registry using Lucid model
    const isAccredited = await this.lookupAccreditation(slug, country)

    await AccreditationCache.create({
      slug,
      country,
      isAccredited,
      source: 'visa_sponsor_registry',
      checkedAt: DateTime.now(),
    })
  }

  /**
   * Check visa_sponsor_registry for a matching company.
   * Uses Lucid ORM model (no raw SQL).
   */
  private async lookupAccreditation(slug: string, country: string): Promise<boolean> {
    try {
      const result = await VisaSponsorRegistry.query()
        .where('country', country)
        .whereILike('companyNameNormalized', `%${slug}%`)
        .first()
      return result !== null
    } catch {
      return false
    }
  }

  private sanitize(value: string, maxLength: number): string {
    return value.trim().slice(0, maxLength)
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
