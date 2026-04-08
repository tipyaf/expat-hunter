/**
 * BuiltInJobScraper — Scrapes job offers from BuiltIn via Apify actor.
 *
 * Targets tech job listings from built.com (BuiltIn).
 *
 * Requires APIFY_TOKEN env var.
 */
import env from '#start/env'
import type { RawJobOffer } from '@expat-hunter/shared'
import { BaseJobOfferScraper, type JobOfferScrapeParams } from './base_job_offer_scraper.js'

/**
 * Shape verified against real Apify actor `shahidirfan~builtin-jobs-scraper` responses
 * (n8n workflow NkATlwAHjTKLGZGN, execution — 2026-04-05).
 *
 * All fields listed below are always present in the response.
 * The n8n workflow extracts an ID from the URL via regex `(\d+)$`.
 */
interface BuiltInApifyResult {
  title: string
  company: string
  category: string
  location: string
  date_posted: string
  description_html: string
  description_text: string
  hiring_remote_in: string
  workplace_type: string
  salary_range_short: string
  seniority: string
  workplace_type_enum: string
  company_overview: string
  url: string
  source: string
}

const ACTOR_ID = 'shahidirfan~builtin-jobs-scraper'

export class BuiltInJobScraper extends BaseJobOfferScraper {
  readonly name = 'builtin-jobs'
  readonly platform = 'builtin' as const
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

    const keywords = params.roles.join(' ')
    const locationSlug = params.city ?? params.country
    const startUrl = `https://builtin.com/jobs?search=${encodeURIComponent(keywords)}&city=${encodeURIComponent(locationSlug)}&country=${encodeURIComponent(params.country)}&allLocations=true`

    const response = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${this.apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectDetails: true,
          dedupe: true,
          startUrl,
          proxyConfiguration: {
            useApifyProxy: true,
            apifyProxyGroups: ['RESIDENTIAL'],
            apifyProxyCountry: params.country,
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Apify BuiltIn actor returned ${response.status}`)
    }

    const items = (await response.json()) as BuiltInApifyResult[]
    if (!Array.isArray(items)) return []

    return items.map((item) => this.toRawJobOffer(item, params.country))
  }

  private toRawJobOffer(item: BuiltInApifyResult, _country: string): RawJobOffer {
    const salary = this.parseSalary(item.salary_range_short)
    const externalId = this.extractIdFromUrl(item.url)

    return {
      title: item.title,
      company: item.company,
      location: item.location,
      url: item.url,
      platform: 'builtin',
      externalId,
      salaryMin: salary.min,
      salaryMax: salary.max,
      currency: salary.currency,
      closingDate: null,
      description: item.description_text,
      remoteType: this.detectRemoteType(item.workplace_type_enum),
      contactEmail: null,
      applyUrl: item.url,
    }
  }

  /** Extracts numeric ID from the BuiltIn URL (e.g. ".../8381914" → "BN-8381914") */
  private extractIdFromUrl(url: string): string | null {
    const match = /(\d+)$/.exec(url)
    return match ? `BN-${match[1]}` : null
  }

  private parseSalary(salary: string): { min: number | null; max: number | null; currency: string | null } {
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

  private detectRemoteType(workplaceType: string): RawJobOffer['remoteType'] {
    const lower = workplaceType.toLowerCase()
    if (lower.includes('remote') || lower === 'remote') return 'remote'
    if (lower.includes('hybrid')) return 'hybrid'
    if (lower === 'unknown') return null
    return 'onsite'
  }
}
