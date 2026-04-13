import type { HttpContext } from '@adonisjs/core/http'
import OfferNotificationService from '#services/offer_notification_service'

const service = new OfferNotificationService()

export default class OfferNotificationsController {
  /**
   * GET /api/notifications/offers-count
   * Returns unread offer count for the authenticated user.
   */
  async count({ auth, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const { count, display } = await service.getBadgeCount(user.id)
    response.ok({ count, display })
  }

  /**
   * POST /api/notifications/mark-seen
   * Updates lastOffersSeenAt to now for the authenticated user.
   */
  async markSeen({ auth, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    await service.markSeen(user.id)
    response.ok({ success: true })
  }
}
