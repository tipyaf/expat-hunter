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
  private readonly seekCountry: string
  private readonly apiToken: string

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
    if (!this.isConfigured) return []

    const keywords = this.buildKeywords(params)
    const maxResults = Math.min(params.maxResults ?? 20, 50)

    try {
      const items = await this.callApifyActor(keywords, maxResults)
      if (!items || items.length === 0) return []

      const companyMap = this.buildCompanyMap(items)
      const contacts = this.convertToRawContacts(companyMap, params.country)

      return this.deduplicateContacts(contacts)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`SeekScraper (${this.country}): ${message}`)
    }
  }

  /** Build search keywords from params, appending city if provided. */
  private buildKeywords(params: ScrapeParams): string {
    let keywords = params.keywords?.join(' ') ?? params.sector ?? 'technology'
    if (params.city) keywords = `${keywords} ${params.city}`
    return keywords
  }

  /** Call the Apify Seek actor and return parsed results. */
  private async callApifyActor(keywords: string, maxResults: number): Promise<SeekApifyResult[]> {
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
    return Array.isArray(items) ? items : []
  }

  /** Deduplicate job listings by company name, merging emails. */
  private buildCompanyMap(items: SeekApifyResult[]): Map<string, { job: SeekApifyResult; emails: string[] }> {
    const companyMap = new Map<string, { job: SeekApifyResult; emails: string[] }>()

    for (const item of items) {
      const companyName = item.companyProfile?.name ?? item.advertiser?.name ?? null
      if (!companyName) continue

      const key = companyName.toLowerCase()
      if (!companyMap.has(key)) {
        companyMap.set(key, { job: item, emails: item.emails ?? [] })
      } else {
        const existing = companyMap.get(key)!
        if (item.emails) existing.emails.push(...item.emails)
      }
    }

    return companyMap
  }

  /** Convert deduplicated company map to RawContact array. */
  private convertToRawContacts(
    companyMap: Map<string, { job: SeekApifyResult; emails: string[] }>,
    country: string
  ): RawContact[] {
    const contacts: RawContact[] = []

    for (const [, { job, emails }] of companyMap) {
      const companyName = job.companyProfile?.name ?? job.advertiser?.name ?? 'Unknown'
      const uniqueEmails = [...new Set(emails)]
      const website = this.cleanValue(job.companyProfile?.website)
      const sector = this.cleanValue(job.companyProfile?.industry)
      const city = job.joblocationInfo?.location ?? job.joblocationInfo?.suburb ?? undefined
      const nlpContact = this.extractContactFromDescription(job.description ?? '')

      const base = {
        companyName,
        companyWebsite: website,
        companySector: sector,
        companyCity: city,
        companyCountry: country,
        source: 'seek' as const,
        sourceDetail: job.jobLink,
      }

      if (nlpContact) {
        contacts.push({ ...base, fullName: nlpContact.name, role: job.title, email: nlpContact.email, emailSource: 'scraped', emailConfidence: 95 })
      } else if (uniqueEmails.length > 0) {
        for (const email of uniqueEmails) {
          contacts.push({ ...base, fullName: 'Hiring Manager', role: job.title, email, emailSource: 'scraped', emailConfidence: 70 })
        }
      } else {
        contacts.push({ ...base, fullName: 'Hiring Manager', role: job.title })
      }
    }

    return contacts
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
