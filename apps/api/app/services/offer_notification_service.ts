import User from '#models/user'
import JobOffer from '#models/job_offer'
import JobSearch from '#models/job_search'
import { DateTime } from 'luxon'

const MAX_BADGE_COUNT = 99

export default class OfferNotificationService {
  /**
   * Count offers created after user's lastOffersSeenAt.
   * If lastOffersSeenAt is null, all offers are new.
   * Only counts offers belonging to the user's searches.
   */
  async getUnreadCount(userId: string): Promise<number> {
    const user = await User.findOrFail(userId)

    // Get all search IDs for this user
    const searches = await JobSearch.query()
      .where('userId', userId)
      .select('id')

    if (searches.length === 0) {
      return 0
    }

    const searchIds = searches.map((s) => s.id)

    let query = JobOffer.query()
      .whereIn('searchId', searchIds)

    if (user.lastOffersSeenAt !== null) {
      query = query.where('createdAt', '>', user.lastOffersSeenAt.toISO()!)
    }

    const result = await query.count('* as total').first()
    const total = Number(result?.$extras?.total ?? 0)

    return total
  }

  /**
   * Returns the badge-friendly count (capped at MAX_BADGE_COUNT).
   */
  async getBadgeCount(userId: string): Promise<{ count: number; display: string }> {
    const count = await this.getUnreadCount(userId)
    const display = count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count)
    return { count, display }
  }

  /**
   * Mark offers as seen — updates user.lastOffersSeenAt to now.
   */
  async markSeen(userId: string): Promise<void> {
    const user = await User.findOrFail(userId)
    user.lastOffersSeenAt = DateTime.now()
    await user.save()
  }
}
