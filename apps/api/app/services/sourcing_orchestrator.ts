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
import Contact from '#models/contact'
import SourcingRun from '#models/sourcing_run'
import ContextEnrichmentService from '#services/context_enrichment_service'
import EmailVerifier from '#services/email_verifier'
import ExpatScoringService from '#services/expat_scoring_service'
import SourcingService from '#services/sourcing_service'
import { sectorRegistry } from '#services/sector_registry'
import SectorTitleService from '#services/sector_title_service'
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
  private sourcingService = new SourcingService()
  private contextService = new ContextEnrichmentService()
  private emailVerifier = new EmailVerifier()
  private scoringService = new ExpatScoringService()
  private titleService = new SectorTitleService()

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

      // Load contacts and companies for remaining phases
      const contacts = await Contact.query()
        .where('sourcingRunId', run.id)
        .preload('company')

      const companies = await this.getUniqueCompanies(contacts)

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

        // Set label based on score
        contact.relevanceLabel = result.score >= 70 ? 'very_relevant'
          : result.score >= 50 ? 'relevant'
          : result.score >= 30 ? 'to_review'
          : 'not_relevant'

        contact.aiRecommendation = result.score >= 50 ? 'contact'
          : result.score >= 30 ? 'manual_review'
          : 'skip'

        await contact.save()
        scored++
      } catch {
        // Phase isolation
      }
    }

    return scored
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
