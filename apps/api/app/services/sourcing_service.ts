/**
 * SourcingService — Orchestrates scraping runs, persists contacts, handles deduplication.
 */
import Company from '#models/company'
import Contact from '#models/contact'
import SourcingRun from '#models/sourcing_run'
import SourcingSource from '#models/sourcing_source'
import type { RawContact, ScrapeParams } from '../scrapers/base_scraper.js'
import { scraperRegistry } from '../scrapers/scraper_registry.js'
import { DateTime } from 'luxon'

export default class SourcingService {
  /**
   * Launch a sourcing run: execute scrapers, persist results, update run status.
   */
  async runSourcing(
    userId: string,
    country: string,
    sector?: string,
    sourceNames?: string[]
  ): Promise<SourcingRun> {
    // Get enabled sources for this country
    const availableSources = await SourcingSource.query()
      .where('enabled', true)
      .where((q) => {
        q.where('country', country).orWhere('country', '*')
      })

    const sourcesToUse = sourceNames
      ? availableSources.filter((s) => sourceNames.includes(s.name))
      : availableSources

    // Create the run
    const run = await SourcingRun.create({
      userId,
      country,
      sector: sector ?? null,
      sources: sourcesToUse.map((s) => s.name),
      status: 'pending',
      contactsFound: 0,
    })

    // Execute scraping
    try {
      run.status = 'running'
      run.startedAt = DateTime.now()
      await run.save()

      const params: ScrapeParams = {
        country,
        sector: sector ?? undefined,
        maxResults: 20,
      }

      const allContacts: RawContact[] = []
      const errors: Record<string, string> = {}

      // Run each scraper (sequentially to respect rate limits)
      for (const source of sourcesToUse) {
        const scraper = scraperRegistry.getByName(source.name, country)
        if (!scraper) {
          errors[source.name] = `No scraper registered for ${source.name}`
          continue
        }

        try {
          const contacts = await scraper.scrape(params)
          allContacts.push(...contacts)
        } catch (error) {
          errors[source.name] = error instanceof Error ? error.message : 'Unknown error'
        }
      }

      // Deduplicate and persist
      const uniqueContacts = this.deduplicateRawContacts(allContacts)
      const persistedCount = await this.persistContacts(userId, run.id, uniqueContacts)

      // Update run
      run.contactsFound = persistedCount
      run.status = 'completed'
      run.completedAt = DateTime.now()
      run.errors = Object.keys(errors).length > 0 ? errors : null
      await run.save()
    } catch (error) {
      run.status = 'failed'
      run.completedAt = DateTime.now()
      run.errors = {
        fatal: error instanceof Error ? error.message : 'Unknown fatal error',
      }
      await run.save()
    }

    return run
  }

  /**
   * Persist raw contacts: create companies and contacts, skip duplicates.
   */
  private async persistContacts(
    userId: string,
    runId: string,
    rawContacts: RawContact[]
  ): Promise<number> {
    let count = 0

    for (const raw of rawContacts) {
      try {
        // Find or create company
        const company = await Company.firstOrCreate(
          { name: raw.companyName, country: raw.companyCountry },
          {
            name: raw.companyName,
            country: raw.companyCountry,
            website: raw.companyWebsite ?? null,
            sector: raw.companySector ?? null,
            city: raw.companyCity ?? null,
            source: raw.source,
          }
        )

        // Check for existing contact (dedup by linkedin or email)
        const existingQuery = Contact.query().where('userId', userId)

        if (raw.linkedinUrl) {
          const existing = await existingQuery.clone().where('linkedinUrl', raw.linkedinUrl).first()
          if (existing) continue
        }
        if (raw.email) {
          const existing = await existingQuery.clone().where('email', raw.email).first()
          if (existing) continue
        }

        // Create contact
        await Contact.create({
          userId,
          companyId: company.id,
          sourcingRunId: runId,
          fullName: raw.fullName,
          role: raw.role,
          email: raw.email ?? null,
          linkedinUrl: raw.linkedinUrl ?? null,
          source: raw.source,
          status: 'identified',
        })

        count++
      } catch {
        // Skip contacts that fail (e.g., unique constraint violation)
      }
    }

    return count
  }

  private deduplicateRawContacts(contacts: RawContact[]): RawContact[] {
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

  /**
   * Get sourcing runs for a user.
   */
  async getRuns(userId: string) {
    return SourcingRun.query()
      .where('userId', userId)
      .orderBy('createdAt', 'desc')
  }

  /**
   * Get a single run with its contacts.
   */
  async getRun(userId: string, runId: string) {
    return SourcingRun.query()
      .where('id', runId)
      .where('userId', userId)
      .preload('contacts', (q) => q.preload('company'))
      .firstOrFail()
  }

  /**
   * Get available sources for a country.
   */
  async getSourcesForCountry(country: string) {
    return SourcingSource.query()
      .where('enabled', true)
      .where((q) => {
        q.where('country', country).orWhere('country', '*')
      })
      .orderBy('name')
  }
}
