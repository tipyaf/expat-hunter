/**
 * Register all available job offer scrapers in the JobOfferScraperRegistry.
 *
 * Import this file at startup to make job offer scrapers available for search runs.
 */
import { jobOfferScraperRegistry } from './job_offer_scraper_registry.js'
import { SeekJobScraper } from './seek_job_scraper.js'
import { LinkedInJobScraper } from './linkedin_job_scraper.js'
import { BuiltInJobScraper } from './builtin_job_scraper.js'
import { ZeilJobScraper } from './zeil_job_scraper.js'

// NZ/AU — Seek via Apify
jobOfferScraperRegistry.register(new SeekJobScraper())

// Global — LinkedIn via Apify
jobOfferScraperRegistry.register(new LinkedInJobScraper())

// Global — BuiltIn via Apify
jobOfferScraperRegistry.register(new BuiltInJobScraper())

// NZ — Zeil via self-hosted Playwright server
jobOfferScraperRegistry.register(new ZeilJobScraper())
