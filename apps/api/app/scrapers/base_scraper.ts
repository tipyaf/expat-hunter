/**
 * BaseScraper — Abstract class for all sourcing scrapers.
 *
 * Provides anti-detection utilities, deduplication, and a standard interface.
 */

export interface ScrapeParams {
  country: string
  sector?: string
  keywords?: string[]
  maxResults?: number
}

export interface RawContact {
  fullName: string
  role: string
  email?: string
  linkedinUrl?: string
  companyName: string
  companyWebsite?: string
  companySector?: string
  companyCity?: string
  companyCountry: string
  source: string
}

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]

export abstract class BaseScraper {
  abstract readonly name: string
  abstract readonly country: string

  abstract scrape(params: ScrapeParams): Promise<RawContact[]>

  protected randomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  }

  protected async delay(minMs = 2000, maxMs = 5000): Promise<void> {
    const ms = minMs + Math.floor(Math.random() * (maxMs - minMs))
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  protected deduplicateContacts(contacts: RawContact[]): RawContact[] {
    const seen = new Map<string, RawContact>()

    for (const contact of contacts) {
      const key =
        contact.linkedinUrl ??
        contact.email ??
        `${contact.fullName}::${contact.companyName}`.toLowerCase()

      if (!seen.has(key)) {
        seen.set(key, contact)
      }
    }

    return Array.from(seen.values())
  }
}
