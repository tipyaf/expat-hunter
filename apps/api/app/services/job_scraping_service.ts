/**
 * JobScrapingService — Orchestrates job scraping across all configured platforms.
 *
 * For a JobSearch, runs all registered platform scrapers, persists results as
 * JobOffer + JobOfferLink records, calls dedup, and enforces plan quotas.
 */
import type { RawJobOffer, JobSearchPlatform, UserPlan } from '@expat-hunter/shared'
import { FREE_MAX_OFFERS, OFFER_BATCH_SIZE, PLAN_PREMIUM } from '@expat-hunter/shared'
import JobSearch from '#models/job_search'
import JobOffer from '#models/job_offer'
import JobOfferLink from '#models/job_offer_link'
import User from '#models/user'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import { JobOfferScraperRegistry, jobOfferScraperRegistry } from '#scrapers/job_offer_scraper_registry'
import type { JobOfferScrapeParams } from '#scrapers/base_job_offer_scraper'

// Side-effect import: registers all job offer scrapers in the singleton registry
import '#scrapers/register_job_offer_scrapers'
import JobOfferDedupService from './job_offer_dedup_service.js'
import JobAiEvaluationService from './job_ai_evaluation_service.js'
import JobCompanyEnrichmentService from './job_company_enrichment_service.js'

interface ScrapingResult {
  totalScraped: number
  newOffers: number
  duplicates: number
  quotaExceeded: number
  errors: ScrapingError[]
}

interface ScrapingError {
  platform: JobSearchPlatform
  message: string
}

export default class JobScrapingService {
  private readonly registry: JobOfferScraperRegistry
  private readonly dedupService: JobOfferDedupService
  private readonly evaluationService: JobAiEvaluationService
  private readonly enrichmentService: JobCompanyEnrichmentService

  constructor(
    registry?: JobOfferScraperRegistry,
    dedupService?: JobOfferDedupService,
    evaluationService?: JobAiEvaluationService,
    enrichmentService?: JobCompanyEnrichmentService
  ) {
    this.registry = registry ?? jobOfferScraperRegistry
    this.dedupService = dedupService ?? new JobOfferDedupService()
    this.evaluationService = evaluationService ?? new JobAiEvaluationService()
    this.enrichmentService = enrichmentService ?? new JobCompanyEnrichmentService()
  }

  /**
   * Run scraping for a given JobSearch across all its configured platforms.
   * Persists JobOffer + JobOfferLink, runs dedup, enforces quotas.
   */
  async runForSearch(searchId: string, userId: string): Promise<ScrapingResult> {
    const search = await JobSearch.query()
      .where('id', searchId)
      .where('userId', userId)
      .firstOrFail()

    const user = await User.findOrFail(userId)

    const result: ScrapingResult = {
      totalScraped: 0,
      newOffers: 0,
      duplicates: 0,
      quotaExceeded: 0,
      errors: [],
    }

    // Step 1: Scrape all platforms (partial failure tolerant)
    const allRawOffers: RawJobOffer[] = []

    for (const platform of search.platforms) {
      try {
        const scraped = await this.scrapePlatform(platform, search)
        allRawOffers.push(...scraped)
        result.totalScraped += scraped.length
        logger.info({ platform, count: scraped.length, searchId }, 'JobScrapingService: platform scraped')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push({ platform, message })
        logger.error({ platform, searchId, error: message }, 'JobScrapingService: scraper failed')
      }
    }

    if (allRawOffers.length === 0) {
      search.lastRunAt = DateTime.now()
      await search.save()
      return result
    }

    // Step 2: Persist raw offers in batches
    const persistedOffers = await this.persistOffers(allRawOffers, search.id)

    // Step 3: Run dedup against existing offers for this search
    const dedupResult = await this.dedupService.dedup(search.id, persistedOffers)
    result.duplicates = dedupResult.duplicates

    // Step 4: Enforce quota
    const quotaResult = await this.enforceQuota(search.id, user.plan)
    result.quotaExceeded = quotaResult
    result.newOffers = persistedOffers.length - dedupResult.duplicates - quotaResult

    // Step 5: Trigger AI evaluation for new offers
    try {
      await this.evaluationService.evaluateForSearch(searchId, userId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ searchId, error: message }, 'JobScrapingService: AI evaluation failed')
    }

    // Step 6: Trigger company enrichment (fail-open)
    try {
      await this.enrichmentService.enrichForSearch(searchId, userId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ searchId, error: message }, 'JobScrapingService: company enrichment failed')
    }

    // Update search lastRunAt
    search.lastRunAt = DateTime.now()
    await search.save()

    logger.info(
      { searchId, ...result },
      'JobScrapingService: run completed'
    )

    return result
  }

  /**
   * Scrape a single platform using the registered scraper.
   */
  private async scrapePlatform(platform: JobSearchPlatform, search: JobSearch): Promise<RawJobOffer[]> {
    const scraper = this.registry.getForPlatform(platform)
    if (!scraper) {
      throw new Error(`No scraper registered for platform: ${platform}`)
    }

    const params: JobOfferScrapeParams = {
      roles: search.roles,
      country: search.countries[0],
      city: search.cities?.[0],
      sector: search.sector ?? undefined,
    }

    return scraper.scrape(params)
  }

  /**
   * Persist RawJobOffer[] as JobOffer + JobOfferLink records.
   * Processes in batches of OFFER_BATCH_SIZE to avoid DB overload.
   */
  private async persistOffers(rawOffers: RawJobOffer[], searchId: string): Promise<JobOffer[]> {
    const persisted: JobOffer[] = []

    for (let i = 0; i < rawOffers.length; i += OFFER_BATCH_SIZE) {
      const batch = rawOffers.slice(i, i + OFFER_BATCH_SIZE)

      for (const raw of batch) {
        // Skip if this platform+externalId combo already exists (re-run scenario)
        if (raw.externalId) {
          const existingLink = await JobOfferLink.query()
            .where('platform', raw.platform)
            .where('externalId', raw.externalId)
            .first()

          if (existingLink) {
            logger.debug(
              { platform: raw.platform, externalId: raw.externalId },
              'JobScrapingService: skipping duplicate offer'
            )
            continue
          }
        }

        const offer = await JobOffer.create({
          searchId,
          title: raw.title,
          companyName: raw.company || null,
          descriptionRaw: raw.description,
          status: 'new',
          salaryMin: raw.salaryMin,
          salaryMax: raw.salaryMax,
          salaryCurrency: raw.currency,
          location: raw.location,
          remoteType: raw.remoteType,
          publicationDates: [DateTime.now().toISO()],
          closingDate: raw.closingDate ? DateTime.fromISO(raw.closingDate) : null,
          contactEmail: raw.contactEmail,
          isRepublished: false,
        })

        await JobOfferLink.create({
          offerId: offer.id,
          platform: raw.platform,
          url: raw.url,
          applyUrl: raw.applyUrl,
          externalId: raw.externalId,
          scrapedAt: DateTime.now(),
        })

        persisted.push(offer)
      }
    }

    return persisted
  }

  /**
   * Enforce plan quotas on new offers.
   * Free plan: max FREE_MAX_OFFERS with status='new'. Extras get 'quota_exceeded'.
   * Premium: unlimited.
   */
  private async enforceQuota(searchId: string, plan: UserPlan): Promise<number> {
    if (plan === PLAN_PREMIUM) {
      return 0
    }

    const newOffers = await JobOffer.query()
      .where('searchId', searchId)
      .where('status', 'new')
      .orderBy('createdAt', 'asc')

    if (newOffers.length <= FREE_MAX_OFFERS) {
      return 0
    }

    const excessOffers = newOffers.slice(FREE_MAX_OFFERS)
    let quotaExceeded = 0

    for (const offer of excessOffers) {
      offer.status = 'quota_exceeded'
      await offer.save()
      quotaExceeded++
    }

    logger.info(
      { searchId, quotaExceeded, total: newOffers.length },
      'JobScrapingService: quota enforced'
    )

    return quotaExceeded
  }
}
