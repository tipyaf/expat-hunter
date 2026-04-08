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

interface LinkedInApifyResult {
  title?: string
  companyName?: string
  location?: string
  url?: string
  jobId?: string
  salary?: string
  description?: string
  workType?: string
  applyUrl?: string
  postedAt?: string
}

const ACTOR_ID = 'apify~linkedin-jobs-scraper'

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
          searchTerms: [keywords],
          location: locationFilter,
          maxResults,
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
    const salary = this.parseSalary(item.salary)

    return {
      title: item.title ?? 'Untitled',
      company: item.companyName ?? 'Unknown',
      location: item.location ?? country,
      url: item.url ?? '',
      platform: 'linkedin',
      externalId: item.jobId ?? null,
      salaryMin: salary.min,
      salaryMax: salary.max,
      currency: salary.currency,
      closingDate: null,
      description: item.description ?? null,
      remoteType: this.detectRemoteType(item.workType),
      contactEmail: null,
      applyUrl: item.applyUrl ?? null,
    }
  }

  private parseSalary(salary?: string): { min: number | null; max: number | null; currency: string | null } {
    if (!salary) return { min: null, max: null, currency: null }

    const rangeMatch = /\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)/.exec(salary)
    if (rangeMatch) {
      return {
        min: Number.parseInt(rangeMatch[1].replaceAll(',', ''), 10),
        max: Number.parseInt(rangeMatch[2].replaceAll(',', ''), 10),
        currency: 'USD',
      }
    }

    return { min: null, max: null, currency: null }
  }

  private detectRemoteType(workType?: string): RawJobOffer['remoteType'] {
    if (!workType) return null
    const lower = workType.toLowerCase()
    if (lower.includes('remote')) return 'remote'
    if (lower.includes('hybrid')) return 'hybrid'
    return 'onsite'
  }
}
