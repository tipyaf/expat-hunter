/**
 * JobOfferService — CRUD operations for job offers.
 *
 * List offers for a search (paginated, filtered by status), get single offer,
 * update status. All queries scoped to the authenticated user's searches.
 */
import { OFFER_PAGE_SIZE } from '@expat-hunter/shared'
import type { JobOfferStatus } from '@expat-hunter/shared'
import JobOffer from '#models/job_offer'
import JobSearch from '#models/job_search'
import logger from '@adonisjs/core/services/logger'

const VALID_OFFER_STATUSES = new Set([
  'new', 'evaluated', 'applied', 'archived', 'duplicate', 'quota_exceeded',
])

interface ListOffersParams {
  searchId: string
  userId: string
  status?: string
  page?: number
}

export default class JobOfferService {
  /**
   * List offers for a search, paginated and optionally filtered by status.
   * Verifies the search belongs to the user.
   */
  async list(params: ListOffersParams): Promise<{
    data: JobOffer[]
    meta: Record<string, unknown>
  }> {
    // Verify ownership
    await this.verifySearchOwnership(params.searchId, params.userId)

    const page = Math.max(1, params.page ?? 1)

    const query = JobOffer.query()
      .where('searchId', params.searchId)
      .preload('links')
      .orderBy('createdAt', 'desc')

    if (params.status && VALID_OFFER_STATUSES.has(params.status)) {
      query.where('status', params.status)
    }

    const result = await query.paginate(page, OFFER_PAGE_SIZE)

    return {
      data: result.all(),
      meta: result.getMeta(),
    }
  }

  /**
   * Get a single offer by ID with all links.
   * Verifies the offer belongs to one of the user's searches.
   */
  async findOrFail(offerId: string, userId: string): Promise<JobOffer> {
    const offer = await JobOffer.query()
      .where('id', offerId)
      .preload('links')
      .first()

    if (!offer) {
      const error = new Error('Job offer not found')
      ;(error as any).status = 404
      ;(error as any).code = 'NOT_FOUND'
      throw error
    }

    // Verify the offer's search belongs to this user
    await this.verifySearchOwnership(offer.searchId, userId)

    return offer
  }

  /**
   * Update the status of an offer.
   */
  async updateStatus(offerId: string, userId: string, status: JobOfferStatus): Promise<JobOffer> {
    const offer = await this.findOrFail(offerId, userId)
    offer.status = status
    await offer.save()

    logger.info({ offerId, status }, 'JobOfferService: status updated')
    return offer
  }

  /**
   * Verify that a search belongs to the given user.
   */
  private async verifySearchOwnership(searchId: string, userId: string): Promise<void> {
    const search = await JobSearch.query()
      .where('id', searchId)
      .where('userId', userId)
      .first()

    if (!search) {
      const error = new Error('Job search not found')
      ;(error as any).status = 404
      ;(error as any).code = 'NOT_FOUND'
      throw error
    }
  }
}
