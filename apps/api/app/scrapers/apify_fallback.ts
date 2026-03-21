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
  private apiToken: string

  private static readonly ACTOR_ID = 'apify~google-search-scraper'

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

    const keywords = params.keywords?.join(' ') ?? params.sector ?? 'technology'
    const query = `${keywords} companies hiring ${params.country}`

    try {
      // Run actor synchronously and get dataset items directly
      const response = await fetch(
        `https://api.apify.com/v2/acts/${ApifyFallback.ACTOR_ID}/run-sync-get-dataset-items?token=${this.apiToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queries: query,
            maxPagesPerQuery: 1,
            resultsPerPage: params.maxResults ?? 10,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Apify Google Search actor returned ${response.status}`)
      }

      const items = (await response.json()) as GoogleSearchResult[]

      if (!Array.isArray(items) || items.length === 0) {
        return []
      }

      // Parse results — Google Search Scraper returns organicResults per query
      const contacts: RawContact[] = []

      for (const item of items) {
        const results = item.organicResults ?? [item]

        for (const result of results.slice(0, params.maxResults ?? 10)) {
          if (result.title) {
            // Extract company name from title (often "Company Name - ...")
            const companyName = result.title.split(/\s[-|–]\s/)[0].trim()
            if (companyName.length > 2) {
              contacts.push({
                fullName: 'Contact',
                role: 'Unknown',
                companyName,
                companyWebsite: result.url ?? undefined,
                companyCountry: params.country,
                source: 'apify-google',
              })
            }
          }
        }
      }

      return this.deduplicateContacts(contacts)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`ApifyFallback: ${message}`)
    }
  }
}
