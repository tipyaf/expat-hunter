/**
 * GoogleLinkedInProxyScraper — Finds LinkedIn profiles via Google search.
 *
 * Uses Google Custom Search JSON API with `site:linkedin.com/in` to legally
 * find LinkedIn profiles without scraping LinkedIn directly.
 * Free tier: 100 requests/day.
 *
 * LEGAL: This uses Google's public search index, not LinkedIn's API.
 * Do NOT use Proxycurl (shut down) or KASPR (fined €240k).
 */
import { BaseScraper, type ScrapeParams, type RawContact } from './base_scraper.js'
import env from '#start/env'
import { sectorRegistry } from '#services/sector_registry'

interface GoogleSearchResponse {
  items?: GoogleSearchItem[]
  searchInformation?: { totalResults: string }
}

interface GoogleSearchItem {
  title: string
  link: string
  snippet: string
}

const GOOGLE_API_BASE = 'https://www.googleapis.com/customsearch/v1'

export class GoogleLinkedInProxyScraper extends BaseScraper {
  readonly name = 'google_linkedin_proxy'
  readonly country = '*'
  private apiKey = env.get('GOOGLE_SEARCH_API_KEY', '')
  private searchEngineId = env.get('GOOGLE_SEARCH_ENGINE_ID', '')

  async scrape(params: ScrapeParams): Promise<RawContact[]> {
    if (!this.apiKey || !this.searchEngineId) return []

    const config = sectorRegistry.getConfigOrDefault(params.sector ?? 'it_software_tech')
    const titles = config.roleWhitelist.slice(0, 5)
    const maxResults = params.maxResults ?? 20
    const allContacts: RawContact[] = []

    for (const title of titles) {
      if (allContacts.length >= maxResults) break

      const contacts = await this.searchLinkedIn(title, params.country)
      allContacts.push(...contacts)

      await this.delay(1000, 2000)
    }

    return this.deduplicateContacts(allContacts).slice(0, maxResults)
  }

  /**
   * Search Google for LinkedIn profiles matching a title + location.
   */
  async searchLinkedIn(title: string, country: string): Promise<RawContact[]> {
    try {
      const locationMap: Record<string, string> = {
        NZ: 'New Zealand',
        AU: 'Australia',
        UK: 'United Kingdom',
        US: 'United States',
        CA: 'Canada',
        FR: 'France',
        DE: 'Germany',
      }
      const location = locationMap[country] ?? country

      const query = `site:linkedin.com/in "${title}" "${location}"`
      const url = `${GOOGLE_API_BASE}?key=${this.apiKey}&cx=${this.searchEngineId}&q=${encodeURIComponent(query)}&num=10`

      const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) return []

      const json = (await res.json()) as GoogleSearchResponse
      const items = json.items ?? []

      return items
        .filter((item) => item.link.includes('linkedin.com/in/'))
        .map((item) => this.parseSearchResult(item, title, country))
        .filter((c) => c.fullName.length > 2)
    } catch {
      return []
    }
  }

  /**
   * Parse a Google search result into a RawContact.
   * LinkedIn titles are formatted as "First Last - Title - Company | LinkedIn"
   */
  private parseSearchResult(item: GoogleSearchItem, searchedTitle: string, country: string): RawContact {
    const parts = item.title.replace(' | LinkedIn', '').split(' - ')
    const fullName = (parts[0] ?? '').trim()
    const role = parts[1]?.trim() ?? searchedTitle
    const companyName = parts[2]?.trim() ?? ''

    return {
      fullName,
      role,
      companyName,
      companyCountry: country,
      linkedinUrl: item.link,
      source: 'google_linkedin_proxy',
      sourceDetail: `google:linkedin:${searchedTitle}`,
    }
  }
}
