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

interface BuiltInApifyResult {
  title?: string
  company_name?: string
  location?: string
  url?: string
  id?: string
  salary?: string
  description?: string
  remote_type?: string
  apply_url?: string
}

const ACTOR_ID = 'curious_coder~builtin-scraper'

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
    const maxResults = Math.min(params.maxResults ?? 20, 50)

    const response = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${this.apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search: keywords,
          location: params.city ?? params.country,
          maxItems: maxResults,
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

  private toRawJobOffer(item: BuiltInApifyResult, country: string): RawJobOffer {
    const salary = this.parseSalary(item.salary)

    return {
      title: item.title ?? 'Untitled',
      company: item.company_name ?? 'Unknown',
      location: item.location ?? country,
      url: item.url ?? '',
      platform: 'builtin',
      externalId: item.id ?? null,
      salaryMin: salary.min,
      salaryMax: salary.max,
      currency: salary.currency,
      closingDate: null,
      description: item.description ?? null,
      remoteType: this.detectRemoteType(item.remote_type),
      contactEmail: null,
      applyUrl: item.apply_url ?? null,
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

  private detectRemoteType(remoteType?: string): RawJobOffer['remoteType'] {
    if (!remoteType) return null
    const lower = remoteType.toLowerCase()
    if (lower.includes('remote')) return 'remote'
    if (lower.includes('hybrid')) return 'hybrid'
    return 'onsite'
  }
}
