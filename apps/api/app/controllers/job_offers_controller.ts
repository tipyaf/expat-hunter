/**
 * JobOffersController — REST endpoints for job offers.
 *
 * GET  /api/job-offers?search_id=&status=&page=  — paginated list
 * GET  /api/job-offers/:id                       — single offer with links
 * POST /api/job-offers/:id/exclude               — exclude with structured reason
 * PUT  /api/job-offers/:id/advice                — update application advice
 * GET  /api/job-offers/exclusions                 — list user exclusion patterns
 */
import type { HttpContext } from '@adonisjs/core/http'
import JobOfferService from '#services/job_offer_service'
import JobOfferExclusion from '#models/job_offer_exclusion'
import { excludeJobOfferValidator, updateAdviceValidator } from '#validators/job_offer_validator'

export default class JobOffersController {
  private readonly service = new JobOfferService()

  /**
   * GET /api/job-offers — Paginated, filtered list of offers.
   */
  async index({ auth, request, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const searchId = request.input('search_id')

    if (!searchId) {
      response.badRequest({
        error: { code: 'MISSING_PARAM', message: 'search_id query parameter is required' },
      })
      return
    }

    try {
      const result = await this.service.list({
        searchId,
        userId: user.id,
        status: request.input('status'),
        page: Number(request.input('page', 1)) || 1,
      })

      response.ok({
        data: result.data.map((offer) => this.serialize(offer)),
        meta: result.meta,
      })
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        response.notFound({
          error: { code: 'NOT_FOUND', message: error.message },
        })
        return
      }
      throw error
    }
  }

  /**
   * GET /api/job-offers/:id — Single offer with all links.
   */
  async show({ auth, params, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()

    try {
      const offer = await this.service.findOrFail(params.id, user.id)

      response.ok({ data: this.serialize(offer) })
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        response.notFound({
          error: { code: 'NOT_FOUND', message: error.message },
        })
        return
      }
      throw error
    }
  }

  /**
   * POST /api/job-offers/:id/exclude — Exclude an offer with structured reason.
   */
  async exclude({ auth, params, request, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(excludeJobOfferValidator)

    try {
      const offer = await this.service.findOrFail(params.id, user.id)

      // Create exclusion record
      await JobOfferExclusion.create({
        userId: user.id,
        offerId: offer.id,
        category: payload.category,
        reason: payload.reason ?? '',
      })

      // Update offer status to excluded
      offer.status = 'excluded'
      await offer.save()

      response.ok({ data: this.serialize(offer) })
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        response.notFound({
          error: { code: 'NOT_FOUND', message: error.message },
        })
        return
      }
      throw error
    }
  }

  /**
   * PUT /api/job-offers/:id/advice — Update application advice text.
   */
  async updateAdvice({ auth, params, request, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(updateAdviceValidator)

    try {
      const offer = await this.service.findOrFail(params.id, user.id)

      offer.applicationAdvice = payload.applicationAdvice
      await offer.save()

      response.ok({ data: this.serialize(offer) })
    } catch (error: any) {
      if (error.code === 'NOT_FOUND') {
        response.notFound({
          error: { code: 'NOT_FOUND', message: error.message },
        })
        return
      }
      throw error
    }
  }

  /**
   * GET /api/job-offers/exclusions — List user's exclusion patterns grouped by category.
   */
  async listExclusions({ auth, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()

    const exclusions = await JobOfferExclusion.query()
      .where('userId', user.id)
      .orderBy('createdAt', 'desc')

    const grouped: Record<string, Array<{ id: string; offerId: string; reason: string; createdAt: string }>> = {}
    for (const exclusion of exclusions) {
      if (!grouped[exclusion.category]) {
        grouped[exclusion.category] = []
      }
      grouped[exclusion.category].push({
        id: exclusion.id,
        offerId: exclusion.offerId,
        reason: exclusion.reason,
        createdAt: exclusion.createdAt.toISO() ?? '',
      })
    }

    response.ok({ data: grouped })
  }

  private serialize(offer: any): Record<string, unknown> {
    return {
      id: offer.id,
      searchId: offer.searchId,
      title: offer.title,
      descriptionRaw: offer.descriptionRaw,
      status: offer.status,
      relevanceScore: offer.relevanceScore,
      matchSummary: offer.matchSummary,
      selectionReason: offer.selectionReason,
      applicationAdvice: offer.applicationAdvice,
      salaryMin: offer.salaryMin,
      salaryMax: offer.salaryMax,
      salaryCurrency: offer.salaryCurrency,
      location: offer.location,
      remoteType: offer.remoteType,
      publicationDates: offer.publicationDates,
      closingDate: offer.closingDate,
      contactEmail: offer.contactEmail,
      isRepublished: offer.isRepublished,
      links: offer.links?.map((link: any) => ({
        id: link.id,
        platform: link.platform,
        url: link.url,
        applyUrl: link.applyUrl,
        externalId: link.externalId,
        scrapedAt: link.scrapedAt,
      })) ?? [],
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
    }
  }
}
