import {
  FREE_MAX_SEARCHES,
  PREMIUM_MAX_SEARCHES,
  PLAN_PREMIUM,
} from '@expat-hunter/shared'
import type { UserPlan, CreateJobSearchPayload, UpdateJobSearchPayload } from '@expat-hunter/shared'
import JobSearch from '#models/job_search'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

export default class JobSearchService {
  /**
   * Create a new job search configuration.
   * Enforces quota: free users get FREE_MAX_SEARCHES, premium get PREMIUM_MAX_SEARCHES.
   *
   * When seniority is 'indifferent', no seniority filter will be applied during scraping.
   */
  async create(userId: string, plan: UserPlan, data: CreateJobSearchPayload): Promise<JobSearch> {
    const maxSearches = plan === PLAN_PREMIUM ? PREMIUM_MAX_SEARCHES : FREE_MAX_SEARCHES
    const activeCount = await this.countActiveSearches(userId)

    if (activeCount >= maxSearches) {
      logger.info({ userId, plan, activeCount, maxSearches }, 'JobSearchService: quota exceeded')
      const error = new Error('Job search quota exceeded. Upgrade to premium for more searches.')
      ;(error as any).status = 403
      ;(error as any).code = 'QUOTA_EXCEEDED'
      throw error
    }

    // Validate salaryMin <= salaryMax when both present
    if (data.salaryMin != null && data.salaryMax != null && data.salaryMin > data.salaryMax) {
      const error = new Error('salaryMin must be less than or equal to salaryMax')
      ;(error as any).status = 422
      ;(error as any).code = 'VALIDATION_ERROR'
      throw error
    }

    const jobSearch = await JobSearch.create({
      userId,
      roles: data.roles,
      countries: data.countries,
      cities: data.cities ?? null,
      platforms: data.platforms,
      seniority: data.seniority,
      sector: data.sector ?? null,
      skills: data.skills ?? null,
      salaryMin: data.salaryMin ?? null,
      salaryMax: data.salaryMax ?? null,
      contractType: data.contractType ?? null,
      frequency: data.frequency ?? 'manual',
      isActive: true,
    })

    logger.info({ userId, searchId: jobSearch.id }, 'JobSearchService: search created')
    return jobSearch
  }

  /**
   * List all job searches for a user (scoped to userId).
   */
  async list(userId: string): Promise<JobSearch[]> {
    return JobSearch.query()
      .where('userId', userId)
      .orderBy('createdAt', 'desc')
  }

  /**
   * Find a specific job search by ID, scoped to the user.
   * Throws 404 if not found.
   */
  async findOrFail(userId: string, searchId: string): Promise<JobSearch> {
    const jobSearch = await JobSearch.query()
      .where('id', searchId)
      .where('userId', userId)
      .first()

    if (!jobSearch) {
      const error = new Error('Job search not found')
      ;(error as any).status = 404
      ;(error as any).code = 'NOT_FOUND'
      throw error
    }

    return jobSearch
  }

  /**
   * Update a job search configuration.
   */
  async update(userId: string, searchId: string, data: UpdateJobSearchPayload): Promise<JobSearch> {
    const jobSearch = await this.findOrFail(userId, searchId)

    // Validate salaryMin <= salaryMax when both are provided or mixed with existing
    const effectiveMin = data.salaryMin ?? jobSearch.salaryMin
    const effectiveMax = data.salaryMax ?? jobSearch.salaryMax
    if (effectiveMin != null && effectiveMax != null && effectiveMin > effectiveMax) {
      const error = new Error('salaryMin must be less than or equal to salaryMax')
      ;(error as any).status = 422
      ;(error as any).code = 'VALIDATION_ERROR'
      throw error
    }

    if (data.roles !== undefined) jobSearch.roles = data.roles
    if (data.countries !== undefined) jobSearch.countries = data.countries
    if (data.cities !== undefined) jobSearch.cities = data.cities ?? null
    if (data.platforms !== undefined) jobSearch.platforms = data.platforms
    if (data.seniority !== undefined) jobSearch.seniority = data.seniority
    if (data.sector !== undefined) jobSearch.sector = data.sector ?? null
    if (data.skills !== undefined) jobSearch.skills = data.skills ?? null
    if (data.salaryMin !== undefined) jobSearch.salaryMin = data.salaryMin ?? null
    if (data.salaryMax !== undefined) jobSearch.salaryMax = data.salaryMax ?? null
    if (data.contractType !== undefined) jobSearch.contractType = data.contractType ?? null
    if (data.frequency !== undefined) jobSearch.frequency = data.frequency

    await jobSearch.save()
    logger.info({ userId, searchId }, 'JobSearchService: search updated')
    return jobSearch
  }

  /**
   * Delete a job search configuration.
   */
  async remove(userId: string, searchId: string): Promise<void> {
    const jobSearch = await this.findOrFail(userId, searchId)
    await jobSearch.delete()
    logger.info({ userId, searchId }, 'JobSearchService: search deleted')
  }

  /**
   * Trigger a manual run of a job search.
   * Stub: updates last_run_at for now. Will be replaced by actual scraping logic later.
   */
  async triggerRun(userId: string, searchId: string): Promise<JobSearch> {
    const jobSearch = await this.findOrFail(userId, searchId)
    jobSearch.lastRunAt = DateTime.now()
    await jobSearch.save()
    logger.info({ userId, searchId }, 'JobSearchService: manual run triggered')
    return jobSearch
  }

  /**
   * Count active searches for a user (quota enforcement helper).
   */
  private async countActiveSearches(userId: string): Promise<number> {
    const result = await JobSearch.query()
      .where('userId', userId)
      .where('isActive', true)
      .count('* as total')

    return Number(result[0].$extras.total)
  }
}
