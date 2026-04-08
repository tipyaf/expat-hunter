/**
 * JobOffersController — REST endpoints for job offers.
 *
 * GET  /api/job-offers?search_id=&status=&page=  — paginated list
 * GET  /api/job-offers/:id                       — single offer with links
 */
import type { HttpContext } from '@adonisjs/core/http'
import JobOfferService from '#services/job_offer_service'

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

  private serialize(offer: any): Record<string, unknown> {
    return {
      id: offer.id,
      searchId: offer.searchId,
      title: offer.title,
      descriptionRaw: offer.descriptionRaw,
      status: offer.status,
      relevanceScore: offer.relevanceScore,
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
