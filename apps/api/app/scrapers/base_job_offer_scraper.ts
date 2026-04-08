/**
 * BaseJobOfferScraper — Abstract class for all job offer scrapers.
 *
 * Each scraper targets a specific platform (Seek, LinkedIn, BuiltIn, Zeil)
 * and returns standardized RawJobOffer[] results.
 *
 * Reuses anti-detection utilities from BaseScraper via composition.
 */
import type { RawJobOffer } from '@expat-hunter/shared'
import type { JobSearchPlatform } from '@expat-hunter/shared'

export interface JobOfferScrapeParams {
  roles: string[]
  country: string
  city?: string
  sector?: string
  maxResults?: number
}

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]

export abstract class BaseJobOfferScraper {
  abstract readonly name: string
  abstract readonly platform: JobSearchPlatform

  abstract scrape(params: JobOfferScrapeParams): Promise<RawJobOffer[]>

  protected randomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  }

  protected async delay(minMs = 2000, maxMs = 5000): Promise<void> {
    const ms = minMs + Math.floor(Math.random() * (maxMs - minMs))
    await new Promise((resolve) => setTimeout(resolve, ms))
  }
}
