/**
 * SeekJobScraper — Scrapes job offers from Seek (NZ/AU) via Apify actor.
 *
 * Reuses the same Apify actor as the contact SeekScraper but returns
 * RawJobOffer[] instead of RawContact[].
 *
 * Requires APIFY_TOKEN env var.
 */
import env from '#start/env'
import type { RawJobOffer } from '@expat-hunter/shared'
import { BaseJobOfferScraper, type JobOfferScrapeParams } from './base_job_offer_scraper.js'

interface SeekApifyResult {
  title?: string
  advertiser?: { name?: string }
  companyProfile?: { name?: string | null }
  joblocationInfo?: {
    displayLocation?: string
    location?: string
    area?: string
  }
  jobLink?: string
  salary?: string
  workTypes?: string
  description?: string
  emails?: string[]
}

const ACTOR_ID = 'websift~seek-job-scraper'

const COUNTRY_MAP: Record<string, string> = {
  NZ: 'new zealand',
  AU: 'australia',
  SG: 'singapore',
  MY: 'malaysia',
}

export class SeekJobScraper extends BaseJobOfferScraper {
  readonly name = 'seek-jobs'
  readonly platform = 'seek' as const
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
    const seekCountry = COUNTRY_MAP[params.country] ?? 'australia'
    const maxResults = Math.min(params.maxResults ?? 20, 50)

    const searchTerm = params.city ? `${keywords} ${params.city}` : keywords

    const response = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${this.apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerm,
          country: seekCountry,
          maxResults,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Apify Seek actor returned ${response.status}`)
    }

    const items = (await response.json()) as SeekApifyResult[]
    if (!Array.isArray(items)) return []

    return items.map((item) => this.toRawJobOffer(item, params.country))
  }

  private toRawJobOffer(item: SeekApifyResult, country: string): RawJobOffer {
    const company = item.companyProfile?.name ?? item.advertiser?.name ?? 'Unknown'
    const location =
      item.joblocationInfo?.displayLocation ??
      item.joblocationInfo?.location ??
      item.joblocationInfo?.area ??
      country
    const salary = this.parseSalary(item.salary)
    const contactEmail = item.emails?.[0] ?? null

    return {
      title: item.title ?? 'Untitled',
      company,
      location,
      url: item.jobLink ?? '',
      platform: 'seek',
      externalId: this.extractExternalId(item.jobLink),
      salaryMin: salary.min,
      salaryMax: salary.max,
      currency: salary.currency,
      closingDate: null,
      description: item.description ?? null,
      remoteType: this.detectRemoteType(item.workTypes),
      contactEmail,
      applyUrl: item.jobLink ?? null,
    }
  }

  private extractExternalId(jobLink?: string): string | null {
    if (!jobLink) return null
    const match = jobLink.match(/\/job\/(\d+)/)
    return match?.[1] ?? null
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

  private detectRemoteType(workTypes?: string): RawJobOffer['remoteType'] {
    if (!workTypes) return null
    const lower = workTypes.toLowerCase()
    if (lower.includes('remote')) return 'remote'
    if (lower.includes('hybrid')) return 'hybrid'
    return 'onsite'
  }
}
