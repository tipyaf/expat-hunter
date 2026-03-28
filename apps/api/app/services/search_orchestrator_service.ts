/**
 * SearchOrchestratorService — Chains scraping → email enrichment → analysis → email generation
 * into a single automated flow, tracking progress in SearchRun.
 *
 * Anti-doublon: excludes contacts in cooldown.
 * Progress: updates SearchRun status and percent at each step.
 */
import Contact from '#models/contact'
import CandidateProfile from '#models/candidate_profile'
import User from '#models/user'
import SearchRun from '#models/search_run'
import type { SearchRunStatus } from '#models/search_run'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import SourcingService from './sourcing_service.js'
import AnalysisService from './analysis_service.js'
import EmailGenerationService from './email_generation_service.js'
import EmailEnricher from './email_enricher.js'
import EmailVerifier from './email_verifier.js'
import ExpatScoringService from './expat_scoring_service.js'
import { HunterCompanySearchScraper } from '../scrapers/hunter_company_search_scraper.js'
import { FREE_QUOTAS } from '@expat-hunter/shared'

interface SearchParams {
  country: string
  sector?: string
  sourceNames?: string[]
  city?: string
  includeHr?: boolean
}

/**
 * Job board and recruitment agency domains to EXCLUDE from Hunter search.
 * These are NOT real employers — they are job listing aggregators.
 * Hunter returns their employees (HR people), not NZ hiring managers.
 */
const JOB_BOARD_DOMAINS = new Set([
  'seek.co.nz', 'seek.com.au', 'indeed.com', 'nz.indeed.com', 'au.indeed.com',
  'linkedin.com', 'glassdoor.com', 'glassdoor.co.nz',
  'trademe.co.nz', 'jobs.govt.nz',
  'builtin.com', 'adecco.com', 'hays.net.nz', 'hays.com.au',
  'welovesalt.com', 'robertwalters.co.nz', 'roberthalf.co.nz',
  'michaelpage.co.nz', 'randstad.co.nz', 'manpower.com',
  'monster.com', 'ziprecruiter.com', 'adzuna.co.nz',
  'jora.com', 'careerjet.co.nz', 'simplyhired.co.nz',
  'workingin-newzealand.com', 'newzealandnow.govt.nz',
  'immigration.govt.nz', 'careers.govt.nz',
])

interface SearchResult {
  searchRunId: string
  contactsFound: number
  contactsRelevant: number
  emailsGenerated: number
  contactsExcludedCooldown: number
}

export default class SearchOrchestratorService {
  private sourcingService: SourcingService
  private analysisService: AnalysisService
  private emailGenerationService: EmailGenerationService

  constructor(
    sourcingService?: SourcingService,
    analysisService?: AnalysisService,
    emailGenerationService?: EmailGenerationService
  ) {
    this.sourcingService = sourcingService ?? new SourcingService()
    this.analysisService = analysisService ?? new AnalysisService()
    this.emailGenerationService = emailGenerationService ?? new EmailGenerationService()
  }

  /**
   * Launch the full search flow: scraping → email enrichment → analysis → email generation.
   */
  /**
   * Launch from an existing SearchRun (created by controller for async response).
   */
  async launchFromRun(searchRun: SearchRun, userId: string, params: SearchParams): Promise<SearchResult> {
    return this.runPipeline(searchRun, userId, params)
  }

  async launch(userId: string, params: SearchParams): Promise<SearchResult> {
    const searchRun = await SearchRun.create({
      userId,
      country: params.country,
      sector: params.sector ?? null,
      status: 'pending',
      contactsFound: 0,
      contactsRelevant: 0,
      emailsGenerated: 0,
      contactsExcludedCooldown: 0,
      progressPercent: 0,
    })
    return this.runPipeline(searchRun, userId, params)
  }

  private async runPipeline(searchRun: SearchRun, userId: string, params: SearchParams): Promise<SearchResult> {
    // Check user plan for contact limit and analysis gating
    const user = await User.findOrFail(userId)
    const contactLimit = user.isPremium ? undefined : FREE_QUOTAS.results

    try {
      searchRun.startedAt = DateTime.now()
      await this.updateStatus(searchRun, 'scraping', 5)

      // Step 1: Scraping (5-33%)
      const sourcingRun = await this.sourcingService.runSourcing(
        userId,
        params.country,
        params.sector,
        params.sourceNames,
        params.city
      )

      searchRun.sourcingRunId = sourcingRun.id
      searchRun.contactsFound = sourcingRun.contactsFound
      await this.updateStatus(searchRun, 'scraping', 25)

      // Step 1b: Hunter domain search — find NAMED contacts at discovered companies
      // Seek gives us companies (who's hiring), Hunter gives us people at those companies
      await this.updateStatus(searchRun, 'scraping', 27)
      const hunterAdded = await this.findNamedContactsViaHunter(userId, sourcingRun.id, params.includeHr ?? false)
      searchRun.contactsFound += hunterAdded
      await this.updateStatus(searchRun, 'scraping', 33)

      logger.info('Step 1b: Hunter added %d named contacts', hunterAdded)

      // Exclude contacts in cooldown
      const cooldownExcluded = await this.markCooldownContacts(userId, sourcingRun.id)
      searchRun.contactsExcludedCooldown = cooldownExcluded

      // Step 2: Email Enrichment (33-50%)
      await this.updateStatus(searchRun, 'enriching', 35)
      await this.enrichContactEmails(userId, sourcingRun.id)
      await this.updateStatus(searchRun, 'enriching', 45)

      // Step 2b: Email Verification (45-50%)
      await this.verifyContactEmails(userId, sourcingRun.id)
      await this.updateStatus(searchRun, 'enriching', 50)

      // Step 3: Analysis (50-75%) — premium only
      if (!user.isPremium) {
        logger.info('SearchOrchestrator: skipping AI analysis for free user %s', userId)
        searchRun.contactsRelevant = 0
        await this.updateStatus(searchRun, 'analyzing', 75)
      } else {
        await this.updateStatus(searchRun, 'analyzing', 52)

        const analysisResult = await this.analysisService.analyzeContacts(userId, {
          sourcingRunId: sourcingRun.id,
          batchSize: 50,
        })

        searchRun.contactsRelevant = analysisResult.analyzed
        await this.updateStatus(searchRun, 'analyzing', 75)
      }

      // Step 4: Email generation — only for contacts that have an email address (premium only)
      if (user.isPremium) {
        await this.updateStatus(searchRun, 'generating', 77)

        const contactsWithEmail = await Contact.query()
          .where('userId', userId)
          .where('aiRecommendation', 'contact')
          .whereNotNull('email')
          .whereDoesntHave('emails', (q) => {
            q.where('type', 'initial')
          })
          .select('id')

        const emailResult = await this.emailGenerationService.generateForContacts(userId, {
          contactIds: contactsWithEmail.map((c) => c.id),
          batchSize: 50,
        })

        searchRun.emailsGenerated = emailResult.generated
      }

      await this.updateStatus(searchRun, 'completed', 100)

      searchRun.completedAt = DateTime.now()
      await searchRun.save()

      logger.info(
        'Search run %s completed: %d found, %d relevant, %d emails, %d excluded',
        searchRun.id,
        searchRun.contactsFound,
        searchRun.contactsRelevant,
        searchRun.emailsGenerated,
        searchRun.contactsExcludedCooldown
      )

      return {
        searchRunId: searchRun.id,
        contactsFound: searchRun.contactsFound,
        contactsRelevant: searchRun.contactsRelevant,
        emailsGenerated: searchRun.emailsGenerated,
        contactsExcludedCooldown: searchRun.contactsExcludedCooldown,
      }
    } catch (error) {
      searchRun.status = 'failed'
      searchRun.errorMessage = error instanceof Error ? error.message : 'Unknown error'
      searchRun.completedAt = DateTime.now()
      await searchRun.save()

      logger.error('Search run %s failed: %s', searchRun.id, searchRun.errorMessage)
      throw error
    }
  }

  /**
   * Get the progress of a search run.
   */
  async getProgress(userId: string, searchRunId: string): Promise<SearchRun> {
    return SearchRun.query()
      .where('id', searchRunId)
      .where('userId', userId)
      .firstOrFail()
  }

  /**
   * Get all search runs for a user.
   */
  async getRuns(userId: string): Promise<SearchRun[]> {
    return SearchRun.query()
      .where('userId', userId)
      .orderBy('createdAt', 'desc')
  }

  /**
   * Get search defaults from user profile.
   */
  async getDefaults(userId: string): Promise<{ country: string | null; sector: string | null }> {
    const profile = await CandidateProfile.query()
      .where('userId', userId)
      .first()

    if (!profile) {
      return { country: null, sector: null }
    }

    return {
      country: profile.targetCountries?.[0] ?? null,
      sector: profile.targetSectors?.[0] ?? null,
    }
  }

  /**
   * Step 1b: For each company found by Seek, run Hunter domain search
   * to find real named contacts with emails. These replace the generic
   * "Hiring Manager" contacts from Seek.
   */
  private async findNamedContactsViaHunter(userId: string, sourcingRunId: string, includeHr: boolean): Promise<number> {
    const hunterScraper = new HunterCompanySearchScraper()
    let added = 0

    // Get all companies from this run
    const companies = await Contact.query()
      .where('sourcingRunId', sourcingRunId)
      .preload('company')
      .select('companyId')
      .groupBy('companyId')

    const seenCompanyIds = new Set<string>()

    for (const contact of companies) {
      const company = contact.company
      if (!company?.domain || seenCompanyIds.has(company.id)) continue
      seenCompanyIds.add(company.id)

      // Skip job boards and recruitment agencies
      if (JOB_BOARD_DOMAINS.has(company.domain)) {
        logger.info('Skipping job board domain: %s', company.domain)
        continue
      }

      try {
        const hunterContacts = await hunterScraper.searchDomain(company.domain, company.country)

        for (const raw of hunterContacts) {
          const name = raw.fullName.toLowerCase().trim()
          if (!name || name === 'hiring manager' || name === 'contact' || name === 'unknown') continue
          if (!raw.email) continue

          // Filter out HR/recruiter roles unless includeHr is true
          if (!includeHr && raw.role) {
            const roleLower = raw.role.toLowerCase()
            const hrKeywords = ['recruiter', 'recruitment', 'talent acquisition', 'human resources', 'hr manager', 'hr director', 'people operations', 'hiring manager']
            if (hrKeywords.some((kw) => roleLower.includes(kw))) continue
          }

          // Skip if email already exists for this user
          const existing = await Contact.query()
            .where('userId', userId)
            .where('email', raw.email)
            .first()
          if (existing) continue

          await Contact.create({
            userId,
            companyId: company.id,
            sourcingRunId,
            fullName: raw.fullName,
            role: raw.role ?? 'Unknown',
            email: raw.email,
            source: raw.source,
            sourceDetail: raw.sourceDetail ?? null,
            emailSource: 'hunter',
            emailConfidence: raw.emailConfidence ?? 90,
            emailStatus: 'probable',
            status: 'identified',
          })
          added++
        }
      } catch (error) {
        logger.warn('Hunter search failed for %s: %s', company.domain, error instanceof Error ? error.message : 'Unknown')
      }
    }

    return added
  }

  /**
   * Step 2b: Verify emails using SMTP handshake for contacts that have emails.
   */
  private async verifyContactEmails(userId: string, sourcingRunId: string): Promise<void> {
    const verifier = new EmailVerifier()

    const contactsWithEmail = await Contact.query()
      .where('userId', userId)
      .where('sourcingRunId', sourcingRunId)
      .whereNotNull('email')
      .where((q) => {
        q.whereNull('emailVerifyMethod').orWhere('emailStatus', 'probable')
      })
      .limit(30)

    let verified = 0
    for (const contact of contactsWithEmail) {
      try {
        const result = await verifier.verify(contact.email!)
        contact.emailStatus = result.status === 'verified' ? 'verified'
          : result.status === 'invalid' ? 'bounced'
          : 'probable'
        contact.emailConfidence = result.confidence
        contact.emailVerifiedAt = DateTime.now()
        contact.emailVerifyMethod = result.method
        await contact.save()
        if (result.status === 'verified') verified++
      } catch {
        // Skip failed verifications
      }
    }

    logger.info('Email verification: %d/%d verified', verified, contactsWithEmail.length)
  }

  /**
   * Enrich emails for contacts from a sourcing run that have no email.
   * Uses Hunter.io → Apollo → pattern inference (always available as fallback).
   * Max 50 contacts per run to respect API rate limits.
   */
  private async enrichContactEmails(userId: string, sourcingRunId: string): Promise<void> {
    const contactsWithoutEmail = await Contact.query()
      .where('userId', userId)
      .where('sourcingRunId', sourcingRunId)
      .whereNull('email')
      .preload('company')
      .limit(50)

    if (contactsWithoutEmail.length === 0) {
      logger.info('Email enrichment: no contacts without email, skipping')
      return
    }

    logger.info(
      'Email enrichment: enriching %d contacts without email',
      contactsWithoutEmail.length
    )

    const enricher = new EmailEnricher()
    let enrichedCount = 0

    // Process in chunks of 3 for concurrency control
    const chunks = this.chunk(contactsWithoutEmail, 3)
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (contact) => {
          const domain =
            contact.company?.domain ?? this.extractDomain(contact.company?.website ?? '')

          if (!domain) return

          try {
            const result = await enricher.enrich(contact.fullName, domain)
            if (result.email) {
              contact.email = result.email
              contact.emailSource = result.source
              contact.emailConfidence = result.confidence
              contact.emailStatus = result.status
              contact.emailAlternatives =
                result.alternatives.length > 0 ? result.alternatives : null
              await contact.save()
              enrichedCount++
            }
          } catch (error) {
            logger.warn(
              'Email enrichment failed for contact %s: %s',
              contact.id,
              error instanceof Error ? error.message : 'Unknown error'
            )
          }
        })
      )
    }

    logger.info(
      'Email enrichment: enriched %d/%d contacts',
      enrichedCount,
      contactsWithoutEmail.length
    )
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
    return chunks
  }

  private extractDomain(website: string): string {
    if (!website) return ''
    try {
      const url = new URL(website.startsWith('http') ? website : `https://${website}`)
      return url.hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  }

  /**
   * Mark contacts in cooldown as excluded from the current run.
   * Returns the number of contacts excluded.
   */
  private async markCooldownContacts(userId: string, sourcingRunId: string): Promise<number> {
    const profile = await CandidateProfile.query()
      .where('userId', userId)
      .first()

    const cooldownDays = profile?.recontactCooldownDays ?? 180
    const now = DateTime.now()

    // Find contacts from this run that already exist (by email or linkedin)
    // and are still in cooldown
    const contactsInCooldown = await Contact.query()
      .where('userId', userId)
      .where('sourcingRunId', sourcingRunId)
      .where((q) => {
        q.where('cooldownUntil', '>', now.toSQL()!)
      })

    return contactsInCooldown.length
  }

  private async updateStatus(
    searchRun: SearchRun,
    status: SearchRunStatus,
    progressPercent: number
  ): Promise<void> {
    searchRun.status = status
    searchRun.progressPercent = progressPercent
    searchRun.currentStep = status
    await searchRun.save()
  }
}
