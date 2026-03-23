/**
 * HunterCompanySearchScraper — Discovers companies via Hunter.io domain search.
 *
 * Uses Hunter /domain-search endpoint to find companies with contacts by sector+country.
 * Registered as a global scraper (country='*') since Hunter covers all countries.
 * Each call returns contacts for a single domain — the caller provides the domain list.
 */
import { BaseScraper, type ScrapeParams, type RawContact } from './base_scraper.js'
import env from '#start/env'
import CacheService from '#services/cache_service'

interface HunterDomainSearchResponse {
  data?: {
    domain: string
    organization: string
    emails: HunterEmail[]
    pattern?: string
  }
  meta?: { results: number; limit: number; offset: number }
}

interface HunterEmail {
  value: string
  type: string
  confidence: number
  first_name: string | null
  last_name: string | null
  position: string | null
  department: string | null
  seniority: string | null
}

const HUNTER_API_BASE = 'https://api.hunter.io/v2'
const MAX_RESULTS_PER_DOMAIN = 20

export class HunterCompanySearchScraper extends BaseScraper {
  readonly name = 'hunter_company_search'
  readonly country = '*'
  private apiKey = env.get('HUNTER_API_KEY')
  private cache = new CacheService()

  async scrape(params: ScrapeParams): Promise<RawContact[]> {
    if (!this.apiKey) return []

    // This scraper expects keywords to contain domain names to search
    const domains = params.keywords ?? []
    if (domains.length === 0) return []

    const allContacts: RawContact[] = []

    for (const domain of domains) {
      const contacts = await this.searchDomain(domain, params.country)
      allContacts.push(...contacts)
    }

    return this.deduplicateContacts(allContacts)
  }

  /**
   * Search a single domain via Hunter.io domain-search endpoint.
   * Returns contacts with email, role, seniority.
   */
  async searchDomain(domain: string, country: string): Promise<RawContact[]> {
    const cacheKey = `hunter_domain:${domain}`

    try {
      const result = await this.cache.getOrFetch<{ contacts: RawContact[] }>(
        'hunter_company_search',
        'company',
        cacheKey,
        async () => {
          const url = `${HUNTER_API_BASE}/domain-search?domain=${encodeURIComponent(domain)}&limit=${MAX_RESULTS_PER_DOMAIN}&api_key=${this.apiKey}`
          const res = await fetch(url, { signal: AbortSignal.timeout(10000) })

          if (!res.ok) return { contacts: [] }

          const json = (await res.json()) as HunterDomainSearchResponse
          const emails = json.data?.emails ?? []
          const org = json.data?.organization ?? domain

          const contacts: RawContact[] = emails
            .filter((e) => e.first_name && e.last_name && e.value)
            .map((e) => ({
              fullName: `${e.first_name} ${e.last_name}`,
              role: e.position ?? 'Unknown',
              email: e.value,
              companyName: org,
              companyWebsite: `https://${domain}`,
              companyCountry: country,
              source: 'hunter_company_search',
              sourceDetail: `hunter:${domain}`,
              emailSource: 'hunter' as const,
              emailConfidence: e.confidence,
            }))

          return { contacts }
        },
        30
      )

      return result.data.contacts
    } catch {
      return []
    }
  }
}
