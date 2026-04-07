/**
 * ScraperRegistry — Registry of available scrapers by country.
 *
 * Manages scraper registration and lookup by country code.
 * Global scrapers (country='*') are available for all countries.
 */
import { BaseScraper } from './base_scraper.js'

export class ScraperRegistry {
  private readonly scrapers: Map<string, BaseScraper[]> = new Map()

  register(scraper: BaseScraper): void {
    const key = scraper.country
    const existing = this.scrapers.get(key) ?? []
    existing.push(scraper)
    this.scrapers.set(key, existing)
  }

  getForCountry(country: string): BaseScraper[] {
    const countryScrapers = this.scrapers.get(country) ?? []
    const globalScrapers = this.scrapers.get('*') ?? []
    return [...countryScrapers, ...globalScrapers]
  }

  getByName(name: string, country: string): BaseScraper | undefined {
    return this.getForCountry(country).find((s) => s.name === name)
  }

  getAll(): BaseScraper[] {
    const all: BaseScraper[] = []
    for (const scrapers of this.scrapers.values()) {
      all.push(...scrapers)
    }
    return all
  }
}

// Singleton registry instance
export const scraperRegistry = new ScraperRegistry()
