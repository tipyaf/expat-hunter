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

/**
 * Shape verified against real Apify actor `websift~seek-job-scraper` responses
 * (n8n workflow qqGiDvxKJuVcX67s, execution 6738 — 2026-04-05).
 *
 * All top-level fields are always present in the response; nested objects
 * use `?` only where the Apify actor legitimately omits data (e.g.
 * companyProfile fields are "N/A" or null for unverified advertisers).
 */
interface SeekApifyResult {
  id: string
  jobLink: string
  applyLink: string
  isExternalApply: boolean
  roleId: string
  title: string
  salary: string
  content: {
    bulletPoints: string | string[]
    jobHook: string
    unEditedContent: string
    sections: string[]
  }
  numApplicants: number
  workArrangements: string
  emails: string[]
  workTypes: string
  classificationInfo: {
    classification: string
    subClassification: string
  }
  joblocationInfo: {
    area: string
    displayLocation: string
    location: string
    country: string
    countryCode: string
    suburb: string
  }
  advertiser: {
    logo: string
    id: string
    name: string
    isVerified: boolean
    isPrivate: string
    registrationDate: string
  }
  companyProfile: {
    id: string | null
    name: string | null
    companyNameSlug: string | null
    overview: string
    industry: string
    size: string
    profile: string
    website: string
    numberOfReviews: string
    rating: string
    perksAndBenefits: string | null
  }
  companyOpenJobs: string
  companyTags: string[]
  employerQuestions: string[]
  employerVideo: string
  listedAt: string
  expiresAtUtc: string
  isVerified: boolean
  hasRoleRequirements: boolean
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

  private toRawJobOffer(item: SeekApifyResult, _country: string): RawJobOffer {
    const company = item.companyProfile.name ?? item.advertiser.name
    const location = item.joblocationInfo.displayLocation || item.joblocationInfo.location
    const salary = this.parseSalary(item.salary)
    const contactEmail = item.emails.length > 0 ? item.emails[0] : null

    return {
      title: item.title,
      company,
      location,
      url: item.jobLink,
      platform: 'seek',
      externalId: item.id,
      salaryMin: salary.min,
      salaryMax: salary.max,
      currency: salary.currency,
      closingDate: item.expiresAtUtc,
      description: item.content.unEditedContent,
      remoteType: this.detectRemoteType(item.workArrangements, item.workTypes),
      contactEmail,
      applyUrl: item.applyLink,
    }
  }

  private parseSalary(salary?: string): { min: number | null; max: number | null; currency: string | null } {
    if (!salary) return { min: null, max: null, currency: null }

    const rangeMatch = /\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)/.exec(salary)
    if (rangeMatch) {
      return {
        min: Number.parseInt(rangeMatch[1].replaceAll(',', ''), 10),
        max: Number.parseInt(rangeMatch[2].replaceAll(',', ''), 10),
        currency: 'NZD',
      }
    }

    return { min: null, max: null, currency: null }
  }

  private detectRemoteType(workArrangements: string, workTypes: string): RawJobOffer['remoteType'] {
    const combined = `${workArrangements} ${workTypes}`.toLowerCase()
    if (combined.includes('remote')) return 'remote'
    if (combined.includes('hybrid')) return 'hybrid'
    return 'onsite'
  }
}
