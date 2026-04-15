import { test } from '@japa/runner'
import User from '#models/user'
import JobSearch from '#models/job_search'
import JobOffer from '#models/job_offer'
import OfferNotificationService from '#services/offer_notification_service'
import { DateTime } from 'luxon'

const TEST_EMAIL_A = 'notif-test-a@test.com'
const TEST_EMAIL_B = 'notif-test-b@test.com'

test.group('OfferNotificationService', (group) => {
  const service = new OfferNotificationService()
  let userAId: string
  let userBId: string
  let searchAId: string

  group.setup(async () => {
    // Create test users
    const userA = (await User.findBy('email', TEST_EMAIL_A)) ?? (await User.create({
      email: TEST_EMAIL_A,
      password: 'password123',
      fullName: 'Notif Test A',
      locale: 'en',
      plan: 'free',
      isAdmin: false,
      lastOffersSeenAt: null,
    }))
    userAId = userA.id

    const userB = (await User.findBy('email', TEST_EMAIL_B)) ?? (await User.create({
      email: TEST_EMAIL_B,
      password: 'password123',
      fullName: 'Notif Test B',
      locale: 'en',
      plan: 'free',
      isAdmin: false,
      lastOffersSeenAt: null,
    }))
    userBId = userB.id

    // Clean up any previous test data
    const searchesA = await JobSearch.query().where('userId', userAId).select('id')
    const searchesB = await JobSearch.query().where('userId', userBId).select('id')
    const allSearchIds = [...searchesA, ...searchesB].map((s) => s.id)
    if (allSearchIds.length > 0) {
      await JobOffer.query().whereIn('searchId', allSearchIds).delete()
    }
    await JobSearch.query().where('userId', userAId).delete()
    await JobSearch.query().where('userId', userBId).delete()

    // Create a search for user A
    const searchA = await JobSearch.create({
      userId: userAId,
      countries: ['NZ'],
      roles: ['developer'],
      platforms: ['seek'],
      seniority: 'intermediate',
      frequency: 'manual',
      isActive: true,
    })
    searchAId = searchA.id

    // Create a search for user B
    const searchB = await JobSearch.create({
      userId: userBId,
      countries: ['AU'],
      roles: ['designer'],
      platforms: ['linkedin'],
      seniority: 'intermediate',
      frequency: 'manual',
      isActive: true,
    })

    // Create offers for user A's search at different times
    // Old offer (Apr 9)
    const offerOld = await JobOffer.create({
      searchId: searchAId,
      title: 'Old Offer',
      status: 'new',
    })
    await JobOffer.query().where('id', offerOld.id)
      .update({ created_at: DateTime.fromISO('2026-04-09T00:00:00.000Z').toSQL() })

    // New offer 1 (Apr 11)
    const offerNew1 = await JobOffer.create({
      searchId: searchAId,
      title: 'New Offer 1',
      status: 'new',
    })
    await JobOffer.query().where('id', offerNew1.id)
      .update({ created_at: DateTime.fromISO('2026-04-11T00:00:00.000Z').toSQL() })

    // New offer 2 (Apr 12)
    const offerNew2 = await JobOffer.create({
      searchId: searchAId,
      title: 'New Offer 2',
      status: 'new',
    })
    await JobOffer.query().where('id', offerNew2.id)
      .update({ created_at: DateTime.fromISO('2026-04-12T00:00:00.000Z').toSQL() })

    // Offer for user B's search (Apr 12) — should not be counted for user A
    const offerB = await JobOffer.create({
      searchId: searchB.id,
      title: 'Other User Offer',
      status: 'new',
    })
    await JobOffer.query().where('id', offerB.id)
      .update({ created_at: DateTime.fromISO('2026-04-12T00:00:00.000Z').toSQL() })

    // Set user A's lastOffersSeenAt to Apr 10
    await User.query().where('id', userAId)
      .update({ last_offers_seen_at: DateTime.fromISO('2026-04-10T00:00:00.000Z').toSQL() })
  })

  group.teardown(async () => {
    // Clean up in reverse order
    const searchesA = await JobSearch.query().where('userId', userAId).select('id')
    const searchesB = await JobSearch.query().where('userId', userBId).select('id')
    const allSearchIds = [...searchesA, ...searchesB].map((s) => s.id)
    if (allSearchIds.length > 0) {
      await JobOffer.query().whereIn('searchId', allSearchIds).delete()
    }
    await JobSearch.query().where('userId', userAId).delete()
    await JobSearch.query().where('userId', userBId).delete()
  })

  // --- getUnreadCount ---

  test('getUnreadCount: counts offers after lastOffersSeenAt for user', async ({ assert }) => {
    // ORACLE: user A has 3 offers total, lastOffersSeenAt = Apr 10
    // o1 (Apr 9) = before → not counted
    // o2 (Apr 11) = after → counted
    // o3 (Apr 12) = after → counted
    // o4 (Apr 12, user B) = different user → not counted
    // Result: 2
    const count = await service.getUnreadCount(userAId)
    assert.equal(count, 2)
  })

  test('getUnreadCount: does not count offers from other users', async ({ assert }) => {
    // ORACLE: user B has 1 offer, lastOffersSeenAt = null → all counted
    // Only o4 belongs to user B → result = 1
    const count = await service.getUnreadCount(userBId)
    assert.equal(count, 1)
  })

  test('getUnreadCount: null lastOffersSeenAt counts all offers as new', async ({ assert }) => {
    // Set user A's lastOffersSeenAt to null
    await User.query().where('id', userAId).update({ last_offers_seen_at: null })

    // ORACLE: all 3 offers for user A are "new" = 3
    const count = await service.getUnreadCount(userAId)
    assert.equal(count, 3)

    // Restore
    await User.query().where('id', userAId)
      .update({ last_offers_seen_at: DateTime.fromISO('2026-04-10T00:00:00.000Z').toSQL() })
  })

  test('getUnreadCount: returns 0 when user has no searches', async ({ assert }) => {
    // Create a user with no searches
    const noSearchUser = (await User.findBy('email', 'notif-no-search@test.com'))
      ?? (await User.create({
        email: 'notif-no-search@test.com',
        password: 'password123',
        fullName: 'No Search User',
        locale: 'en',
        plan: 'free',
        isAdmin: false,
      }))

    const count = await service.getUnreadCount(noSearchUser.id)
    assert.equal(count, 0)
  })

  // --- getBadgeCount ---

  test('getBadgeCount: returns count and display string', async ({ assert }) => {
    const { count, display } = await service.getBadgeCount(userAId)
    assert.equal(count, 2)
    assert.equal(display, '2')
  })

  // --- markSeen ---

  test('markSeen: updates lastOffersSeenAt to now', async ({ assert }) => {
    const beforeTimestamp = DateTime.now()
    await service.markSeen(userAId)

    const user = await User.findOrFail(userAId)
    assert.isNotNull(user.lastOffersSeenAt)
    assert.isTrue(user.lastOffersSeenAt! >= beforeTimestamp)
  })

  test('markSeen: after marking, unread count is 0', async ({ assert }) => {
    // markSeen was called in previous test, lastOffersSeenAt is now
    const count = await service.getUnreadCount(userAId)
    assert.equal(count, 0)
  })

  // --- security: userId scoping ---

  test('getUnreadCount: scoped to userId — user A cannot see user B offers', async ({ assert }) => {
    // User A's count should NOT include user B's offer
    // After markSeen, user A has 0 unread (lastOffersSeenAt = now)
    // User B still has 1
    const countB = await service.getUnreadCount(userBId)
    assert.equal(countB, 1)
  })
})
