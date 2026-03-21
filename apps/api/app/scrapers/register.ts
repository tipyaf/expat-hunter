/**
 * Register all available scrapers in the ScraperRegistry.
 *
 * Import this file at startup to make scrapers available for sourcing runs.
 */
import { ApifyFallback } from './apify_fallback.js'
import { scraperRegistry } from './scraper_registry.js'
import { SeekScraper } from './seek_scraper.js'

// New Zealand — Seek via Apify
scraperRegistry.register(new SeekScraper('NZ'))

// Australia — Seek via Apify
scraperRegistry.register(new SeekScraper('AU'))

// Global fallback — Google Search via Apify
scraperRegistry.register(new ApifyFallback())
