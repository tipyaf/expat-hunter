/**
 * LinkedInJobScraper — Scrapes job offers from LinkedIn via Apify actor.
 *
 * IMPORTANT: LinkedIn scraping is ALWAYS via Apify — never in-house Playwright.
 * This is an architectural decision to avoid LinkedIn ban risk.
 *
 * Requires APIFY_TOKEN env var.
 */
import env from '#start/env'
import type { RawJobOffer } from '@expat-hunter/shared'
import { BaseJobOfferScraper, type JobOfferScrapeParams } from './base_job_offer_scraper.js'

/**
 * Shape verified against real Apify actor `ivanvs~linkedin-job-scraper` responses
 * (n8n workflow 8B9RoyIysvEJ9vCy — code nodes access these fields).
 *
 * Fields use `?` because this is an external API we don't control —
 * recent executions all returned `{ title: "No jobs found" }` with no
 * other fields, proving optional is correct here.
 */
interface LinkedInApifyResult {
  id?: number
  title?: string
  description?: string
  url?: string
  applyUrl?: string
  company?: {
    name?: string
    url?: string
  }
  location?: {
    city?: string
    country?: string
  }
  datePosted?: string
  isClosed?: boolean
}

const ACTOR_ID = 'ivanvs~linkedin-job-scraper'

export class LinkedInJobScraper extends BaseJobOfferScraper {
  readonly name = 'linkedin-jobs'
  readonly platform = 'linkedin' as const
  private readonly apiToken: string

  constructor() {
    super()
    this.apiToken = env.get('APIFY_TOKEN', '')
  }

  get isConfigured(): boolean {
    return this.apiToken.length > 0
  }

  async scrape(params: JobOfferScrapeParams): Promise<RawJobOffer[]> {
    if (!this.apiToken) {
      throw new Error('APIFY_TOKEN is not configured')
    }

    const keywords = params.roles.join(', ')
    const maxResults = Math.min(params.maxResults ?? 20, 50)
    const locationFilter = params.city
      ? `${params.city}, ${params.country}`
      : params.country

    const response = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${this.apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords,
          location: locationFilter,
          maxRecords: maxResults,
          datePosted: '1 week',
          employmentTypes: ['F', 'T'],
          extractCompanyData: false,
          jobIds: [],
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Apify LinkedIn actor returned ${response.status}`)
    }

    const items = (await response.json()) as LinkedInApifyResult[]
    if (!Array.isArray(items)) return []

    return items.map((item) => this.toRawJobOffer(item, params.country))
  }

  private toRawJobOffer(item: LinkedInApifyResult, country: string): RawJobOffer {
    const location = item.location
      ? [item.location.city, item.location.country].filter(Boolean).join(', ')
      : country

    return {
      title: item.title ?? 'Untitled',
      company: item.company?.name ?? 'Unknown',
      location,
      url: item.url ?? '',
      platform: 'linkedin',
      externalId: item.id == null ? null : String(item.id),
      salaryMin: null,
      salaryMax: null,
      currency: null,
      closingDate: null,
      description: item.description ?? null,
      remoteType: null,
      contactEmail: null,
      applyUrl: item.applyUrl ?? null,
    }
  }
}
