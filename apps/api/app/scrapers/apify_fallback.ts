/**
 * ApifyFallback — Uses Apify's Google Search Scraper as a fallback source.
 *
 * Searches Google for companies hiring in a given country/sector,
 * extracts company names from search results.
 *
 * Requires APIFY_TOKEN in env (graceful degradation if not set).
 */
import env from '#start/env'
import { type RawContact, type ScrapeParams, BaseScraper } from './base_scraper.js'

interface GoogleSearchResult {
  title?: string
  description?: string
  url?: string
  organicResults?: Array<{
    title?: string
    description?: string
    url?: string
  }>
}

export class ApifyFallback extends BaseScraper {
  readonly name = 'apify'
  readonly country = '*'
  private readonly apiToken: string

  private static readonly ACTOR_ID = 'apify~google-search-scraper'
  private static readonly MIN_COMPANY_NAME_LENGTH = 3

  constructor() {
    super()
    this.apiToken = env.get('APIFY_TOKEN', '')
  }

  get isConfigured(): boolean {
    return this.apiToken.length > 0
  }

  async scrape(params: ScrapeParams): Promise<RawContact[]> {
    if (!this.isConfigured) {
      return []
    }

    const query = this.buildSearchQuery(params)

    try {
      const items = await this.runGoogleSearchActor(query, params.maxResults ?? 10)

      if (!Array.isArray(items) || items.length === 0) {
        return []
      }

      const contacts = this.parseSearchResults(items, params)
      return this.deduplicateContacts(contacts)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`ApifyFallback: ${message}`)
    }
  }

  private buildSearchQuery(params: ScrapeParams): string {
    const keywords = params.keywords?.join(' ') ?? params.sector ?? 'technology'
    return `${keywords} companies hiring ${params.country}`
  }

  private async runGoogleSearchActor(query: string, resultsPerPage: number): Promise<GoogleSearchResult[]> {
    const response = await fetch(
      `https://api.apify.com/v2/acts/${ApifyFallback.ACTOR_ID}/run-sync-get-dataset-items?token=${this.apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: query,
          maxPagesPerQuery: 1,
          resultsPerPage,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Apify Google Search actor returned ${response.status}`)
    }

    return (await response.json()) as GoogleSearchResult[]
  }

  private parseSearchResults(items: GoogleSearchResult[], params: ScrapeParams): RawContact[] {
    const contacts: RawContact[] = []
    const maxResults = params.maxResults ?? 10

    for (const item of items) {
      const results = item.organicResults ?? [item]

      for (const result of results.slice(0, maxResults)) {
        const contact = this.extractContactFromResult(result, params.country)
        if (contact) {
          contacts.push(contact)
        }
      }
    }

    return contacts
  }

  private extractContactFromResult(
    result: { title?: string; url?: string },
    country: string
  ): RawContact | null {
    if (!result.title) {
      return null
    }

    const companyName = result.title.split(/\s[-|–]\s/)[0].trim()
    if (companyName.length < ApifyFallback.MIN_COMPANY_NAME_LENGTH) {
      return null
    }

    return {
      fullName: 'Contact',
      role: 'Unknown',
      companyName,
      companyWebsite: result.url ?? undefined,
      companyCountry: country,
      source: 'apify-google',
    }
  }
}
