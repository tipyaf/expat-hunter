/**
 * JobOfferScraperRegistry — Registry of available job offer scrapers by platform.
 *
 * Manages scraper registration and lookup by platform.
 */
import type { JobSearchPlatform } from '@expat-hunter/shared'
import { BaseJobOfferScraper } from './base_job_offer_scraper.js'

export class JobOfferScraperRegistry {
  private readonly scrapers: Map<JobSearchPlatform, BaseJobOfferScraper> = new Map()

  register(scraper: BaseJobOfferScraper): void {
    this.scrapers.set(scraper.platform, scraper)
  }

  getForPlatform(platform: JobSearchPlatform): BaseJobOfferScraper | null {
    return this.scrapers.get(platform) ?? null
  }

  getAll(): BaseJobOfferScraper[] {
    return Array.from(this.scrapers.values())
  }
}

// Singleton registry instance
export const jobOfferScraperRegistry = new JobOfferScraperRegistry()
