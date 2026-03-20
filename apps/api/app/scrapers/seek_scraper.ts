/**
 * SeekScraper — Scrapes job listings from Seek (NZ/AU) via Apify's websift/seek-job-scraper actor.
 *
 * Strategy: search for job postings matching the candidate's target sector/roles,
 * then extract company info and hiring manager details from the listings.
 *
 * Requires APIFY_TOKEN env var (graceful degradation if not set).
 */
import env from '#start/env'
import { type RawContact, type ScrapeParams, BaseScraper } from './base_scraper.js'

interface SeekApifyResult {
  title: string
  advertiser?: {
    name: string
    isVerified?: boolean | string
  }
  companyProfile?: {
    name?: string | null
    website?: string
    industry?: string
    size?: string
  }
  joblocationInfo?: {
    area?: string
    country?: string
    countryCode?: string
    displayLocation?: string
    location?: string
    suburb?: string
  }
  emails?: string[]
  phoneNumbers?: string[]
  jobLink?: string
  salary?: string
  workTypes?: string
}

export class SeekScraper extends BaseScraper {
  readonly name = 'seek'
  readonly country: string
  private seekCountry: string
  private apiToken: string

  private static readonly ACTOR_ID = 'websift~seek-job-scraper'

  /** Map ISO country codes to Seek's expected country filter values */
  private static readonly COUNTRY_MAP: Record<string, string> = {
    NZ: 'new zealand',
    AU: 'australia',
    SG: 'singapore',
    MY: 'malaysia',
    PH: 'philippines',
    ID: 'indonesia',
    TH: 'thailand',
    HK: 'hongkong',
  }

  constructor(country: string) {
    super()
    this.country = country
    this.seekCountry = SeekScraper.COUNTRY_MAP[country] ?? 'australia'
    this.apiToken = env.get('APIFY_TOKEN', '')
  }

  get isConfigured(): boolean {
    return this.apiToken.length > 0
  }

  async scrape(params: ScrapeParams): Promise<RawContact[]> {
    if (!this.isConfigured) {
      return []
    }

    const keywords = params.keywords?.join(' ') ?? params.sector ?? 'technology'
    const maxResults = Math.min(params.maxResults ?? 20, 50) // Cap to control costs

    try {
      // Start the actor run synchronously (waits for completion)
      const response = await fetch(
        `https://api.apify.com/v2/acts/${SeekScraper.ACTOR_ID}/run-sync-get-dataset-items?token=${this.apiToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchTerm: keywords,
            country: this.seekCountry,
            maxResults,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Apify Seek actor returned ${response.status}`)
      }

      const items = (await response.json()) as SeekApifyResult[]

      if (!Array.isArray(items) || items.length === 0) {
        return []
      }

      // Extract unique companies from job listings
      const companyMap = new Map<string, { job: SeekApifyResult; emails: string[] }>()

      for (const item of items) {
        const companyName =
          item.companyProfile?.name ??
          item.advertiser?.name ??
          null

        if (!companyName) continue

        const key = companyName.toLowerCase()
        if (!companyMap.has(key)) {
          companyMap.set(key, {
            job: item,
            emails: item.emails ?? [],
          })
        } else {
          // Merge emails from duplicate company listings
          const existing = companyMap.get(key)!
          if (item.emails) {
            existing.emails.push(...item.emails)
          }
        }
      }

      // Convert to RawContacts
      const contacts: RawContact[] = []

      for (const [, { job, emails }] of companyMap) {
        const companyName = job.companyProfile?.name ?? job.advertiser?.name ?? 'Unknown'
        const uniqueEmails = [...new Set(emails)]
        const website = this.cleanValue(job.companyProfile?.website)
        const sector = this.cleanValue(job.companyProfile?.industry)
        const city = job.joblocationInfo?.location ?? job.joblocationInfo?.suburb ?? undefined

        if (uniqueEmails.length > 0) {
          // Create a contact for each email found
          for (const email of uniqueEmails) {
            contacts.push({
              fullName: 'Hiring Manager',
              role: job.title,
              email,
              companyName,
              companyWebsite: website,
              companySector: sector,
              companyCity: city,
              companyCountry: params.country,
              source: 'seek',
            })
          }
        } else {
          // No email — still create a company contact
          contacts.push({
            fullName: 'Hiring Manager',
            role: job.title,
            companyName,
            companyWebsite: website,
            companySector: sector,
            companyCity: city,
            companyCountry: params.country,
            source: 'seek',
          })
        }
      }

      return this.deduplicateContacts(contacts)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`SeekScraper (${this.country}): ${message}`)
    }
  }

  /** Clean "N/A" and empty values returned by the Apify actor */
  private cleanValue(value?: string | null): string | undefined {
    if (!value || value === 'N/A' || value === 'N, /, A') return undefined
    return value
  }
}
