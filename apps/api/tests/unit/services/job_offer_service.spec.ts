import { test } from '@japa/runner'
import { OFFER_PAGE_SIZE } from '@expat-hunter/shared'
import JobOfferService from '#services/job_offer_service'
import User from '#models/user'
import JobSearch from '#models/job_search'
import JobOffer from '#models/job_offer'

const TEST_EMAIL = 'job-offer-service-test@test.com'

test.group('JobOfferService', (group) => {
  const service = new JobOfferService()
  let userId: string
  let searchId: string
  let offerId: string

  group.setup(async () => {
    const user =
      (await User.findBy('email', TEST_EMAIL)) ??
      (await User.create({
        email: TEST_EMAIL,
        password: 'password123',
        fullName: 'Job Offer Service Test',
        locale: 'en',
        plan: 'free',
        isAdmin: false,
      }))
    userId = user.id

    await JobSearch.query().where('userId', userId).delete()

    const search = await JobSearch.create({
      userId,
      roles: ['Backend Engineer'],
      countries: ['AU'],
      platforms: ['seek'],
      seniority: 'mid',
      frequency: 'weekly',
    })
    searchId = search.id

    const offer = await JobOffer.create({
      searchId,
      title: 'Backend Engineer at Acme',
      status: 'new',
      companyName: 'Acme Corp',
    })
    offerId = offer.id
  })

  group.teardown(async () => {
    await JobOffer.query().where('searchId', searchId).delete()
    await JobSearch.query().where('userId', userId).delete()
    await User.query().where('email', TEST_EMAIL).delete()
  })

  // ─── Existence checks ───────────────────────────────────────────────────

  test('constructor creates service instance', ({ assert }) => {
    assert.instanceOf(service, JobOfferService)
  })

  test('has list, findOrFail, updateStatus methods', ({ assert }) => {
    assert.isFunction(service.list)
    assert.isFunction(service.findOrFail)
    assert.isFunction(service.updateStatus)
  })

  // ─── OFFER_PAGE_SIZE ────────────────────────────────────────────────────

  test('OFFER_PAGE_SIZE constant is 20', ({ assert }) => {
    // ORACLE: OFFER_PAGE_SIZE = 20 (from shared constants)
    assert.equal(OFFER_PAGE_SIZE, 20)
  })

  // ─── Behavioral: findOrFail ─────────────────────────────────────────────

  test('findOrFail — returns the offer for a valid id/user', async ({ assert }) => {
    // ORACLE: offer.id = offerId, offer.title = 'Backend Engineer at Acme'
    const offer = await service.findOrFail(offerId, userId)
    assert.equal(offer.id, offerId)
    assert.equal(offer.title, 'Backend Engineer at Acme')
  })

  test('findOrFail — throws NOT_FOUND for an unknown offer id', async ({ assert }) => {
    // ORACLE: random UUID not in DB → error.code = 'NOT_FOUND'
    let thrownCode: string | undefined
    try {
      await service.findOrFail('00000000-0000-0000-0000-000000000000', userId)
    } catch (error: unknown) {
      thrownCode = (error as Error & { code?: string }).code
    }
    assert.equal(thrownCode, 'NOT_FOUND')
  })

  // ─── Behavioral: updateStatus ───────────────────────────────────────────

  test('updateStatus — persists the new status to the database', async ({ assert }) => {
    // ORACLE: status changes from 'new' to 'interested', DB reflects the change
    const updated = await service.updateStatus(offerId, userId, 'interested')
    assert.equal(updated.status, 'interested')

    // Verify persistence: reload from DB
    const reloaded = await JobOffer.findOrFail(offerId)
    assert.equal(reloaded.status, 'interested')
  })

  // ─── Behavioral: list ───────────────────────────────────────────────────

  test('list — returns paginated offers for the user search', async ({ assert }) => {
    // ORACLE: 1 offer in search → data array length = 1, meta.total = 1
    const result = await service.list({ searchId, userId })
    assert.isTrue(result.data.length >= 1)
    assert.isTrue(result.data.some((o) => o.id === offerId))
  })

  test('list — filters by status when provided', async ({ assert }) => {
    // ORACLE: offer status is 'interested' (updated above), filter 'interested' → 1, filter 'applied' → 0
    const matched = await service.list({ searchId, userId, status: 'interested' })
    assert.isTrue(matched.data.some((o) => o.id === offerId))

    const unmatched = await service.list({ searchId, userId, status: 'applied' })
    assert.isFalse(unmatched.data.some((o) => o.id === offerId))
  })

  // ─── Behavioral: hasCrossContact ────────────────────────────────────────

  test('hasCrossContact — returns false when no lead exists at that company', async ({ assert }) => {
    // ORACLE: no contacts/companies in DB for this user → false
    const result = await service.hasCrossContact(userId, 'Unknown Company XYZ')
    assert.isFalse(result)
  })

  test('hasCrossContact — returns false for null company name', async ({ assert }) => {
    // ORACLE: companyName = null → early return false
    const result = await service.hasCrossContact(userId, null)
    assert.isFalse(result)
  })
})
