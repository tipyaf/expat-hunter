/**
 * Register all available scrapers in the ScraperRegistry.
 *
 * Import this file at startup to make scrapers available for sourcing runs.
 */
import { ApifyFallback } from './apify_fallback.js'
import { HunterCompanySearchScraper } from './hunter_company_search_scraper.js'
import { scraperRegistry } from './scraper_registry.js'
import { SeekScraper } from './seek_scraper.js'

// New Zealand — Seek via Apify
scraperRegistry.register(new SeekScraper('NZ'))

// Australia — Seek via Apify
scraperRegistry.register(new SeekScraper('AU'))

// Global — Hunter.io domain search (all countries, high-quality contacts with emails)
scraperRegistry.register(new HunterCompanySearchScraper())

// Global fallback — Google Search via Apify
scraperRegistry.register(new ApifyFallback())
