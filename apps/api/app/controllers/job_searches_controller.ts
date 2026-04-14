import type { HttpContext } from '@adonisjs/core/http'
import JobSearchService from '#services/job_search_service'
import JobScrapingService from '#services/job_scraping_service'
import { jobOfferScraperRegistry } from '#scrapers/job_offer_scraper_registry'
import { createJobSearchValidator, updateJobSearchValidator } from '#validators/job_search_validator'

// Side-effect import: registers all job offer scrapers in the singleton registry
import '#scrapers/register_job_offer_scrapers'

export default class JobSearchesController {
  private readonly service = new JobSearchService()
  private readonly scrapingService = new JobScrapingService(jobOfferScraperRegistry)

  /**
   * GET /api/job-searches — List user's job search configurations.
   */
  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const searches = await this.service.list(user.id)
    return response.ok({ data: searches })
  }

  /**
   * POST /api/job-searches — Create a new job search configuration.
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(createJobSearchValidator)

    try {
      const search = await this.service.create(user.id, user.plan, data)
      return response.created({ data: search })
    } catch (error: any) {
      if (error.code === 'QUOTA_EXCEEDED') {
        return response.forbidden({
          error: { code: 'QUOTA_EXCEEDED', message: error.message },
        })
      }
      if (error.code === 'VALIDATION_ERROR') {
        return response.unprocessableEntity({
          error: { code: 'VALIDATION_ERROR', message: error.message },
        })
      }
      throw error
    }
  }

  /**
   * PUT /api/job-searches/:id — Update a job search configuration.
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(updateJobSearchValidator)

    try {
      const search = await this.service.update(user.id, params.id, data)
      return response.ok({ data: search })
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        return response.notFound({
          error: { code: 'NOT_FOUND', message: error.message },
        })
      }
      if (error.code === 'VALIDATION_ERROR') {
        return response.unprocessableEntity({
          error: { code: 'VALIDATION_ERROR', message: error.message },
        })
      }
      throw error
    }
  }

  /**
   * DELETE /api/job-searches/:id — Delete a job search configuration.
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()

    try {
      await this.service.remove(user.id, params.id)
      return response.ok({ data: { deleted: true } })
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        return response.notFound({
          error: { code: 'NOT_FOUND', message: error.message },
        })
      }
      throw error
    }
  }

  /**
   * POST /api/job-searches/:id/run — Trigger scraping for a job search.
   * Delegates to JobScrapingService which runs all platform scrapers,
   * persists results, runs dedup, and enforces quotas.
   */
  async run({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()

    try {
      const result = await this.scrapingService.runForSearch(params.id, user.id)
      return response.ok({ data: result })
    } catch (error: any) {
      if (error.code === 'E_ROW_NOT_FOUND' || error.code === 'NOT_FOUND') {
        return response.notFound({
          error: { code: 'NOT_FOUND', message: 'Job search not found' },
        })
      }
      throw error
    }
  }
}
