/**
 * ZeilJobScraper — Scrapes job offers from Zeil via Apify actor.
 *
 * Targets NZ-focused job listings from zeil.co.nz.
 *
 * Requires APIFY_TOKEN env var.
 */
import env from '#start/env'
import type { RawJobOffer } from '@expat-hunter/shared'
import { BaseJobOfferScraper, type JobOfferScrapeParams } from './base_job_offer_scraper.js'

interface ZeilApifyResult {
  title?: string
  company?: string
  location?: string
  url?: string
  id?: string
  salary?: string
  description?: string
  type?: string
  closing_date?: string
}

const ACTOR_ID = 'curious_coder~zeil-scraper'

export class ZeilJobScraper extends BaseJobOfferScraper {
  readonly name = 'zeil-jobs'
  readonly platform = 'zeil' as const
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
          location: params.city ?? '',
          maxItems: maxResults,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Apify Zeil actor returned ${response.status}`)
    }

    const items = (await response.json()) as ZeilApifyResult[]
    if (!Array.isArray(items)) return []

    return items.map((item) => this.toRawJobOffer(item, params.country))
  }

  private toRawJobOffer(item: ZeilApifyResult, country: string): RawJobOffer {
    const salary = this.parseSalary(item.salary)

    return {
      title: item.title ?? 'Untitled',
      company: item.company ?? 'Unknown',
      location: item.location ?? country,
      url: item.url ?? '',
      platform: 'zeil',
      externalId: item.id ?? null,
      salaryMin: salary.min,
      salaryMax: salary.max,
      currency: salary.currency,
      closingDate: item.closing_date ?? null,
      description: item.description ?? null,
      remoteType: this.detectRemoteType(item.type),
      contactEmail: null,
      applyUrl: item.url ?? null,
    }
  }

  private parseSalary(salary?: string): { min: number | null; max: number | null; currency: string | null } {
    if (!salary) return { min: null, max: null, currency: null }

    const rangeMatch = salary.match(/\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)/)
    if (rangeMatch) {
      return {
        min: Number.parseInt(rangeMatch[1].replace(/,/g, ''), 10),
        max: Number.parseInt(rangeMatch[2].replace(/,/g, ''), 10),
        currency: 'NZD',
      }
    }

    return { min: null, max: null, currency: null }
  }

  private detectRemoteType(type?: string): RawJobOffer['remoteType'] {
    if (!type) return null
    const lower = type.toLowerCase()
    if (lower.includes('remote')) return 'remote'
    if (lower.includes('hybrid')) return 'hybrid'
    return 'onsite'
  }
}
