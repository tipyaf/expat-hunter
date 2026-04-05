/**
 * SourcingOrchestrator — Coordinates the 5-phase qualified contacts pipeline.
 *
 * Phase 1: Company discovery + contact scraping (delegates to SourcingService)
 * Phase 2: Context enrichment (culture, tech stack, hiring signals)
 * Phase 3: Contact filtering by sector title relevance
 * Phase 4: Email verification (SMTP + pattern scoring)
 * Phase 5: Expat scoring (v3 with contextScore)
 *
 * Each phase is isolated — failure in one does NOT stop the others.
 * No concurrent runs for the same userId.
 */
import Company from '#models/company'
import Contact, { type RelevanceLabel, type AiRecommendation, type EmailSource } from '#models/contact'
import SourcingRun from '#models/sourcing_run'
import ContextEnrichmentService from '#services/context_enrichment_service'
import EmailEnricher from '#services/email_enricher'
import EmailVerifier from '#services/email_verifier'
import ExpatScoringService from '#services/expat_scoring_service'
import SourcingService from '#services/sourcing_service'
import { sectorRegistry } from '#services/sector_registry'
import SectorTitleService from '#services/sector_title_service'
import { HunterCompanySearchScraper } from '../scrapers/hunter_company_search_scraper.js'
import { DateTime } from 'luxon'

export interface OrchestratorResult {
  run: SourcingRun
  phases: PhaseResult[]
  totalContacts: number
  qualifiedContacts: number
  emailVerified: number
}

interface PhaseResult {
  phase: string
  status: 'completed' | 'failed' | 'skipped'
  duration: number
  details: string
}

const ACTIVE_RUNS = new Set<string>()

export default class SourcingOrchestrator {
  private readonly sourcingService = new SourcingService()
  private readonly hunterScraper = new HunterCompanySearchScraper()
  private readonly emailEnricher = new EmailEnricher()
  private readonly contextService = new ContextEnrichmentService()
  private readonly emailVerifier = new EmailVerifier()
  private readonly scoringService = new ExpatScoringService()
  private readonly titleService = new SectorTitleService()

  /**
   * Run the full 5-phase pipeline. Blocks concurrent runs for same userId.
   */
  async run(
    userId: string,
    country: string,
    sector?: string,
    sourceNames?: string[]
  ): Promise<OrchestratorResult> {
    if (ACTIVE_RUNS.has(userId)) {
      throw new Error(`Sourcing run already in progress for user ${userId}`)
    }

    ACTIVE_RUNS.add(userId)
    const phases: PhaseResult[] = []

    try {
      // Phase 1 — Discovery + scraping
      const run = await this.executePhase('discovery', phases, () =>
        this.sourcingService.runSourcing(userId, country, sector, sourceNames)
      )

      if (!run) {
        throw new Error('Phase 1 failed — no run created')
      }

      // Load companies discovered in Phase 1
      const phase1Contacts = await Contact.query()
        .where('sourcingRunId', run.id)
        .preload('company')

      const companies = await this.getUniqueCompanies(phase1Contacts)

      // Phase 1b — Hunter domain search on each company to find NAMED contacts
      // Seek gives us companies (who's hiring), Hunter gives us people at those companies
      await this.executePhase('hunter_contacts', phases, () =>
        this.findNamedContacts(companies, run.id, userId, country)
      )

      // Reload all contacts (now includes Hunter contacts)
      const contacts = await Contact.query()
        .where('sourcingRunId', run.id)
        .preload('company')

      // Phase 2 — Context enrichment (non-blocking per company)
      await this.executePhase('context_enrichment', phases, () =>
        this.enrichCompanies(companies)
      )

      // Phase 3 — Filter by sector titles
      await this.executePhase('title_filtering', phases, () =>
        this.filterByTitles(contacts, sector ?? 'it_software_tech', country)
      )

      // Phase 4 — Email verification
      const verifiedCount = await this.executePhase('email_verification', phases, () =>
        this.verifyEmails(contacts)
      )

      // Phase 5 — Scoring
      await this.executePhase('scoring', phases, () =>
        this.scoreContacts(contacts)
      )

      // Reload contacts with updated data
      const updatedContacts = await Contact.query()
        .where('sourcingRunId', run.id)

      const qualifiedCount = updatedContacts.filter(
        (c) => c.relevanceScore !== null && c.relevanceScore >= 50
      ).length

      return {
        run,
        phases,
        totalContacts: updatedContacts.length,
        qualifiedContacts: qualifiedCount,
        emailVerified: verifiedCount ?? 0,
      }
    } finally {
      ACTIVE_RUNS.delete(userId)
    }
  }

  /**
   * Check if a user has an active run.
   */
  static isRunning(userId: string): boolean {
    return ACTIVE_RUNS.has(userId)
  }

  // ─── Phase implementations ────────────────────────────────────────────────

  /**
   * Phase 1b — For each company found by Seek, run Hunter domain search
   * to find real named contacts (not "Hiring Manager").
   * Also enrich email for contacts that have a name but no email.
   */
  private async findNamedContacts(
    companies: Company[],
    runId: string,
    userId: string,
    country: string
  ): Promise<number> {
    let added = 0

    for (const company of companies) {
      if (!company.domain) continue

      try {
        const hunterContacts = await this.hunterScraper.searchDomain(company.domain, country)

        for (const raw of hunterContacts) {
          if (!this.isValidHunterContact(raw)) continue

          if (raw.email) {
            const existing = await Contact.query()
              .where('userId', userId)
              .where('email', raw.email)
              .first()
            if (existing) continue
          }

          await this.createHunterContact(raw, userId, company.id, runId)
          added++
        }
      } catch {
        // Phase isolation — skip failed companies
      }
    }

    return added
  }

  private isValidHunterContact(raw: { fullName: string }): boolean {
    const name = raw.fullName.toLowerCase().trim()
    const genericNames = ['', 'hiring manager', 'contact', 'unknown']
    return !genericNames.includes(name)
  }

  private async createHunterContact(
    raw: { fullName: string; role?: string; email?: string; source: string; sourceDetail?: string; emailSource?: EmailSource; emailConfidence?: number },
    userId: string,
    companyId: string,
    runId: string
  ): Promise<void> {
    await Contact.create({
      userId,
      companyId,
      sourcingRunId: runId,
      fullName: raw.fullName,
      role: raw.role ?? 'Unknown',
      email: raw.email ?? null,
      source: raw.source,
      sourceDetail: raw.sourceDetail ?? null,
      emailSource: raw.emailSource ?? null,
      emailConfidence: raw.emailConfidence ?? null,
      emailStatus: raw.email ? 'probable' : null,
      status: 'identified',
    })
  }

  private async enrichCompanies(companies: Company[]): Promise<number> {
    let enriched = 0

    for (const company of companies) {
      if (company.contextEnrichedAt) continue
      if (!company.domain) continue

      try {
        const data = await this.contextService.enrich(company.domain, company.name)
        company.contextData = data as unknown as Record<string, unknown>
        company.contextEnrichedAt = DateTime.now()
        await company.save()
        enriched++
      } catch {
        // Phase isolation — skip failed companies
      }
    }

    return enriched
  }

  private async filterByTitles(
    contacts: Contact[],
    sector: string,
    country: string
  ): Promise<number> {
    const titles = await this.titleService.getFlatTitles(sector, country)
    const titlesLower = titles.map((t) => t.toLowerCase())
    let filtered = 0

    for (const contact of contacts) {
      const role = (contact.role ?? '').toLowerCase()
      const isRelevant = sectorRegistry.isRoleRelevant(role, sector)
        || titlesLower.some((t) => role.includes(t))

      if (!isRelevant) {
        contact.relevanceLabel = 'not_relevant'
        contact.relevanceReason = 'Title does not match target sector roles'
        contact.relevanceScore = 10
        await contact.save()
        filtered++
      }
    }

    return filtered
  }

  private async verifyEmails(contacts: Contact[]): Promise<number> {
    let verified = 0

    for (const contact of contacts) {
      if (!contact.email) continue
      if (contact.emailStatus === 'verified') continue

      try {
        const result = await this.emailVerifier.verify(contact.email)
        contact.emailStatus = result.status === 'verified' ? 'verified'
          : result.status === 'invalid' ? 'bounced'
          : 'probable'
        contact.emailConfidence = result.confidence
        contact.emailVerifiedAt = DateTime.now()
        contact.emailVerifyMethod = result.method
        await contact.save()

        if (result.status === 'verified') verified++
      } catch {
        // Phase isolation — skip failed verifications
      }
    }

    return verified
  }

  private async scoreContacts(contacts: Contact[]): Promise<number> {
    let scored = 0

    for (const contact of contacts) {
      try {
        const result = await this.scoringService.calculate(contact)
        contact.relevanceScore = result.score
        contact.scoreBreakdown = result.breakdown as unknown as Record<string, unknown>
        contact.scoreVersion = result.version
        contact.relevanceLabel = this.getRelevanceLabel(result.score)
        contact.aiRecommendation = this.getAiRecommendation(result.score)

        await contact.save()
        scored++
      } catch {
        // Phase isolation
      }
    }

    return scored
  }

  private getRelevanceLabel(score: number): RelevanceLabel {
    if (score >= 70) return 'very_relevant'
    if (score >= 50) return 'relevant'
    if (score >= 30) return 'to_review'
    return 'not_relevant'
  }

  private getAiRecommendation(score: number): AiRecommendation {
    if (score >= 50) return 'contact'
    if (score >= 30) return 'manual_review'
    return 'skip'
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async executePhase<T>(
    name: string,
    phases: PhaseResult[],
    fn: () => Promise<T>
  ): Promise<T | null> {
    const start = Date.now()
    try {
      const result = await fn()
      phases.push({
        phase: name,
        status: 'completed',
        duration: Date.now() - start,
        details: `${typeof result === 'number' ? result : 'ok'}`,
      })
      return result
    } catch (err) {
      phases.push({
        phase: name,
        status: 'failed',
        duration: Date.now() - start,
        details: err instanceof Error ? err.message : 'Unknown error',
      })
      return null
    }
  }

  private async getUniqueCompanies(contacts: Contact[]): Promise<Company[]> {
    const seen = new Map<string, Company>()
    for (const contact of contacts) {
      const company = contact.company
      if (company && !seen.has(company.id)) {
        seen.set(company.id, company)
      }
    }
    return Array.from(seen.values())
  }
}
