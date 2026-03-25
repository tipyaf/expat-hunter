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
  description?: string
}

// NLP patterns to extract named contact from job description text
const CONTACT_NLP_PATTERNS = [
  /[Cc]ontact\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:at|on|via)\s+([\w.+-]+@[\w.-]+\.[a-z]{2,})/,
  /[Pp]lease\s+(?:contact|email|reach)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:at|on)\s+([\w.+-]+@[\w.-]+\.[a-z]{2,})/,
  /([A-Z][a-z]+\s+[A-Z][a-z]+)\s*[–-]\s*(?:[\w\s]+)\s+(?:at|@)\s+([\w.+-]+@[\w.-]+\.[a-z]{2,})/,
]

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

    let keywords = params.keywords?.join(' ') ?? params.sector ?? 'technology'
    // Append city to search term if provided (Seek filters by location in search)
    if (params.city) keywords = `${keywords} ${params.city}`
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

        // Try NLP extraction from job description
        const nlpContact = this.extractContactFromDescription(job.description ?? '')

        if (nlpContact) {
          contacts.push({
            fullName: nlpContact.name,
            role: job.title,
            email: nlpContact.email,
            emailSource: 'scraped',
            emailConfidence: 95,
            companyName,
            companyWebsite: website,
            companySector: sector,
            companyCity: city,
            companyCountry: params.country,
            source: 'seek',
            sourceDetail: job.jobLink,
          })
        } else if (uniqueEmails.length > 0) {
          for (const email of uniqueEmails) {
            contacts.push({
              fullName: 'Hiring Manager',
              role: job.title,
              email,
              emailSource: 'scraped',
              emailConfidence: 70,
              companyName,
              companyWebsite: website,
              companySector: sector,
              companyCity: city,
              companyCountry: params.country,
              source: 'seek',
              sourceDetail: job.jobLink,
            })
          }
        } else {
          // No email — create company placeholder for CompanyEnricher to enrich later
          contacts.push({
            fullName: 'Hiring Manager',
            role: job.title,
            companyName,
            companyWebsite: website,
            companySector: sector,
            companyCity: city,
            companyCountry: params.country,
            source: 'seek',
            sourceDetail: job.jobLink,
          })
        }
      }

      return this.deduplicateContacts(contacts)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`SeekScraper (${this.country}): ${message}`)
    }
  }

  /** Extract named contact + email from job description text using NLP patterns */
  private extractContactFromDescription(
    description: string
  ): { name: string; email: string } | null {
    for (const pattern of CONTACT_NLP_PATTERNS) {
      const match = description.match(pattern)
      if (match && match[1] && match[2]) {
        return { name: match[1], email: match[2] }
      }
    }
    return null
  }

  /** Clean "N/A" and empty values returned by the Apify actor */
  private cleanValue(value?: string | null): string | undefined {
    if (!value || value === 'N/A' || value === 'N, /, A') return undefined
    return value
  }
}
