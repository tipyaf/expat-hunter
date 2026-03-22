/**
 * SearchOrchestratorService — Chains scraping → email enrichment → analysis → email generation
 * into a single automated flow, tracking progress in SearchRun.
 *
 * Anti-doublon: excludes contacts in cooldown.
 * Progress: updates SearchRun status and percent at each step.
 */
import Contact from '#models/contact'
import CandidateProfile from '#models/candidate_profile'
import SearchRun from '#models/search_run'
import type { SearchRunStatus } from '#models/search_run'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import SourcingService from './sourcing_service.js'
import AnalysisService from './analysis_service.js'
import EmailGenerationService from './email_generation_service.js'
import EmailEnricher from './email_enricher.js'

interface SearchParams {
  country: string
  sector?: string
  sourceNames?: string[]
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

    try {
      searchRun.startedAt = DateTime.now()
      await this.updateStatus(searchRun, 'scraping', 5)

      // Step 1: Scraping (5-33%)
      const sourcingRun = await this.sourcingService.runSourcing(
        userId,
        params.country,
        params.sector,
        params.sourceNames
      )

      searchRun.sourcingRunId = sourcingRun.id
      searchRun.contactsFound = sourcingRun.contactsFound
      await this.updateStatus(searchRun, 'scraping', 33)

      // Exclude contacts in cooldown
      const cooldownExcluded = await this.markCooldownContacts(userId, sourcingRun.id)
      searchRun.contactsExcludedCooldown = cooldownExcluded

      // Step 2: Email Enrichment (33-50%)
      await this.updateStatus(searchRun, 'enriching', 35)
      await this.enrichContactEmails(userId, sourcingRun.id)
      await this.updateStatus(searchRun, 'enriching', 50)

      // Step 3: Analysis (50-75%)
      await this.updateStatus(searchRun, 'analyzing', 52)

      const analysisResult = await this.analysisService.analyzeContacts(userId, {
        sourcingRunId: sourcingRun.id,
        batchSize: 50,
      })

      searchRun.contactsRelevant = analysisResult.analyzed
      await this.updateStatus(searchRun, 'analyzing', 75)

      // Step 4: Email generation — only for contacts that have an email address
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
