/**
 * SourcingService — Orchestrates scraping runs, persists contacts, handles deduplication.
 */
import Company from '#models/company'
import Contact from '#models/contact'
import SourcingRun from '#models/sourcing_run'
import SourcingSource from '#models/sourcing_source'
import type { RawContact, ScrapeParams } from '../scrapers/base_scraper.js'
import { scraperRegistry } from '../scrapers/scraper_registry.js'
import CacheService from './cache_service.js'
import CompanyEnricher from './company_enricher.js'
import VisaSponsorRegistryService from './visa_sponsor_registry.js'
import { DateTime } from 'luxon'

export default class SourcingService {
  private cacheService = new CacheService()
  /**
   * Launch a sourcing run: execute scrapers, persist results, update run status.
   */
  async runSourcing(
    userId: string,
    country: string,
    sector?: string,
    sourceNames?: string[],
    city?: string
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
        city: city ?? undefined,
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
      const { count: persistedCount, newCompanies } = await this.persistContacts(
        userId,
        run.id,
        uniqueContacts
      )

      // Update run
      run.contactsFound = persistedCount
      run.status = 'completed'
      run.completedAt = DateTime.now()
      run.errors = Object.keys(errors).length > 0 ? errors : null
      await run.save()

      // Trigger CompanyEnricher async (non-blocking) for ALL new companies
      this.triggerCompanyEnrichment(userId, run.id, newCompanies).catch(() => {})
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
   * Generic names that should be deduplicated by company + role instead of by name.
   */
  /**
   * Generic contact names (not real person names) used for deduplication.
   * English-only for now — see US for i18n extension.
   */
  private static readonly GENERIC_NAMES = new Set([
    'hiring manager',
    'contact',
    'unknown',
    'hr manager',
    'recruiter',
    'team',
    'hiring',
    'jobs',
    'talent',
    'recruitment',
    'careers',
    'hr',
    'info',
    'support',
    'connect',
    'admin',
    'office',
    'reception',
    'enquiries',
    'general',
    'hello',
    'apply',
    'people',
    'human resources',
    'talent acquisition',
    'people operations',
  ])

  private isGenericName(name: string): boolean {
    return SourcingService.GENERIC_NAMES.has(name.toLowerCase().trim())
  }

  /**
   * Persist raw contacts: create companies and contacts, skip duplicates.
   * Returns count of persisted contacts and list of all new companies (for CompanyEnricher).
   */
  private async persistContacts(
    userId: string,
    runId: string,
    rawContacts: RawContact[]
  ): Promise<{ count: number; newCompanies: Company[] }> {
    let count = 0
    const allCompanies = new Map<string, Company>()
    const enricher = new CompanyEnricher()
    const visaRegistry = new VisaSponsorRegistryService()

    for (const raw of rawContacts) {
      try {
        // Find or create company
        const companyKey = `${raw.companyName}::${raw.companyCountry}`.toLowerCase()
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

        // Extract and store domain
        if (!company.domain && raw.companyWebsite) {
          company.domain = enricher.extractDomain(raw.companyWebsite)
        }

        // Check visa sponsor status if not already checked
        if (!company.visaRegistryCheckedAt) {
          const visaCheck = await visaRegistry
            .checkCompany(raw.companyName, raw.companyCountry)
            .catch(() => null)

          if (visaCheck) {
            company.visaSponsorStatus = visaCheck.isAccredited ? 'accredited' : 'not_found'
            company.visaSponsorCountries = visaCheck.countries.length > 0 ? visaCheck.countries : null
            company.visaRegistryCheckedAt = DateTime.now()
          }
        }

        if (company.$isDirty) await company.save()

        allCompanies.set(companyKey, company)

        // Cache company data
        await this.cacheService.getOrFetch(raw.source, 'company', companyKey, async () => ({
          id: company.id,
          name: company.name,
          country: company.country,
          website: company.website,
          sector: company.sector,
          city: company.city,
        }))

        // Dedup by linkedin or email
        const existingQuery = Contact.query().where('userId', userId)
        if (raw.linkedinUrl) {
          const existing = await existingQuery.clone().where('linkedinUrl', raw.linkedinUrl).first()
          if (existing) continue
        }
        if (raw.email) {
          const existing = await existingQuery.clone().where('email', raw.email).first()
          if (existing) continue
        }

        // Dedup generic names by company + role
        if (this.isGenericName(raw.fullName)) {
          const existingGeneric = await Contact.query()
            .where('userId', userId)
            .where('companyId', company.id)
            .where('role', raw.role)
            .whereIn('fullName', Array.from(SourcingService.GENERIC_NAMES))
            .first()
          if (existingGeneric) continue
        }

        // Create contact with new enrichment fields
        await Contact.create({
          userId,
          companyId: company.id,
          sourcingRunId: runId,
          fullName: raw.fullName,
          role: raw.role,
          email: raw.email ?? null,
          linkedinUrl: raw.linkedinUrl ?? null,
          source: raw.source,
          sourceDetail: raw.sourceDetail ?? null,
          emailSource: raw.emailSource ?? null,
          emailConfidence: raw.emailConfidence ?? null,
          emailStatus: raw.email ? 'probable' : null,
          githubUrl: raw.githubUrl ?? null,
          status: 'identified',
        })

        count++
      } catch {
        // Skip contacts that fail (e.g., unique constraint violation)
      }
    }

    // Return ALL new companies not yet crawled (for CompanyEnricher)
    const newCompanies = Array.from(allCompanies.values())
      .filter((c) => !c.teamCrawledAt)

    return { count, newCompanies }
  }

  /**
   * Trigger CompanyEnricher for all new companies (non-blocking).
   * Extracts team members from /team, /about pages to find more contacts.
   * Processes max 15 companies, 3 in parallel.
   */
  private async triggerCompanyEnrichment(
    userId: string,
    runId: string,
    companies: Company[]
  ): Promise<void> {
    const enricher = new CompanyEnricher()
    const chunks = this.chunk(companies.slice(0, 15), 3)

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map((company) => enricher.enrichCompany(company, userId, runId).catch(() => {}))
      )
    }
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
    return chunks
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
