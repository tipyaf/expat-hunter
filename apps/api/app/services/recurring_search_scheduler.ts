/**
 * RecurringSearchScheduler — Finds due job searches and triggers scraping runs.
 *
 * Called by the internal cron endpoint GET /api/scheduler/run-due.
 * Picks up searches where next_run_at <= now() and isActive = true,
 * triggers runForSearch for each, then updates next_run_at.
 */
import { computeNextRunAt } from '@expat-hunter/shared'
import JobSearch from '#models/job_search'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import JobScrapingService from './job_scraping_service.js'

interface SchedulerResult {
  searchesRun: number
  searchIds: string[]
  errors: SchedulerError[]
}

interface SchedulerError {
  searchId: string
  message: string
}

export default class RecurringSearchScheduler {
  private readonly scrapingService: JobScrapingService

  constructor(scrapingService?: JobScrapingService) {
    this.scrapingService = scrapingService ?? new JobScrapingService()
  }

  /**
   * Find all active searches where next_run_at <= now and run them.
   * Updates next_run_at after each successful run.
   */
  async runDueSearches(): Promise<SchedulerResult> {
    const now = DateTime.now()

    const dueSearches = await JobSearch.query()
      .where('isActive', true)
      .whereNotNull('nextRunAt')
      .where('nextRunAt', '<=', now.toSQL()!)
      .orderBy('nextRunAt', 'asc')

    logger.info(
      { dueCount: dueSearches.length },
      'RecurringSearchScheduler: found due searches'
    )

    const result: SchedulerResult = {
      searchesRun: 0,
      searchIds: [],
      errors: [],
    }

    for (const search of dueSearches) {
      try {
        await this.scrapingService.runForSearch(search.id, search.userId)

        // Update lastRunAt and compute next nextRunAt
        const nextRunAtIso = computeNextRunAt(search.frequency, new Date())
        search.lastRunAt = DateTime.now()
        search.nextRunAt = nextRunAtIso ? DateTime.fromISO(nextRunAtIso) : null
        await search.save()

        result.searchesRun++
        result.searchIds.push(search.id)

        logger.info(
          { searchId: search.id, userId: search.userId, nextRunAt: search.nextRunAt?.toISO() },
          'RecurringSearchScheduler: search run completed'
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        result.errors.push({ searchId: search.id, message })

        logger.error(
          { searchId: search.id, userId: search.userId, error: message },
          'RecurringSearchScheduler: search run failed'
        )
      }
    }

    logger.info(
      { searchesRun: result.searchesRun, errors: result.errors.length },
      'RecurringSearchScheduler: batch complete'
    )

    return result
  }
}
