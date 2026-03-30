/**
 * SearchOrchestratorService — Chains scraping -> email enrichment -> analysis -> email generation
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
import HunterContactService from './hunter_contact_service.js'
import EmailEnrichmentOrchestrator from './email_enrichment_orchestrator.js'
import { FREE_QUOTAS } from '@expat-hunter/shared'

interface SearchParams {
  country: string
  sector?: string
  sourceNames?: string[]
  city?: string
  includeHr?: boolean
}

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
  private hunterContactService: HunterContactService
  private emailEnrichmentOrchestrator: EmailEnrichmentOrchestrator

  constructor(
    sourcingService?: SourcingService,
    analysisService?: AnalysisService,
    emailGenerationService?: EmailGenerationService
  ) {
    this.sourcingService = sourcingService ?? new SourcingService()
    this.analysisService = analysisService ?? new AnalysisService()
    this.emailGenerationService = emailGenerationService ?? new EmailGenerationService()
    this.hunterContactService = new HunterContactService()
    this.emailEnrichmentOrchestrator = new EmailEnrichmentOrchestrator()
  }

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
    const user = await User.findOrFail(userId)

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

      // Step 1b: Hunter domain search — find named contacts at discovered companies
      await this.updateStatus(searchRun, 'scraping', 27)
      const hunterAdded = await this.hunterContactService.findNamedContactsViaHunter(
        userId, sourcingRun.id, params.includeHr ?? false
      )
      searchRun.contactsFound += hunterAdded
      await this.updateStatus(searchRun, 'scraping', 33)

      logger.info('Step 1b: Hunter added %d named contacts', hunterAdded)

      // Exclude contacts in cooldown
      const cooldownExcluded = await this.markCooldownContacts(userId, sourcingRun.id)
      searchRun.contactsExcludedCooldown = cooldownExcluded

      // Step 2: Email Enrichment (33-50%)
      await this.updateStatus(searchRun, 'enriching', 35)
      await this.emailEnrichmentOrchestrator.enrichContactEmails(userId, sourcingRun.id)
      await this.updateStatus(searchRun, 'enriching', 45)

      // Step 2b: Email Verification (45-50%)
      await this.emailEnrichmentOrchestrator.verifyContactEmails(userId, sourcingRun.id)
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

      // Step 4: Email generation — only for contacts with email (premium only)
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
   * Mark contacts in cooldown as excluded from the current run.
   */
  private async markCooldownContacts(userId: string, sourcingRunId: string): Promise<number> {
    const now = DateTime.now()

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
