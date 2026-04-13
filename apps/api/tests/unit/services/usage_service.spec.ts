import { test } from '@japa/runner'
import { PLAN_FREE, PLAN_PREMIUM, FREE_QUOTAS } from '@expat-hunter/shared'
import UsageService from '#services/usage_service'
import User from '#models/user'

const TEST_EMAIL = 'usage-service-test@test.com'

test.group('UsageService', (group) => {
  const service = new UsageService()
  let testUserId: string

  group.setup(async () => {
    // Create or find a real test user (FK constraint requires valid user_id)
    const user = (await User.findBy('email', TEST_EMAIL)) ?? (await User.create({
      email: TEST_EMAIL,
      password: 'password123',
      fullName: 'Usage Service Test',
      locale: 'en',
      plan: 'free',
      isAdmin: false,
    }))
    testUserId = user.id

    // Clean up any existing counters for test user
    const { default: UsageCounter } = await import('#models/usage_counter')
    await UsageCounter.query().where('userId', testUserId).delete()
  })

  group.teardown(async () => {
    const { default: UsageCounter } = await import('#models/usage_counter')
    await UsageCounter.query().where('userId', testUserId).delete()
  })

  test('getUsage returns 0 for a user with no counters', async ({ assert }) => {
    const usage = await service.getUsage(testUserId, 'searches')
    assert.equal(usage, 0)
  })

  test('increment creates counter if not exists and returns new count', async ({ assert }) => {
    const count = await service.increment(testUserId, 'searches')
    assert.equal(count, 1)
  })

  test('increment adds to existing counter', async ({ assert }) => {
    const count = await service.increment(testUserId, 'searches')
    assert.equal(count, 2)
  })

  test('increment supports custom amount', async ({ assert }) => {
    const count = await service.increment(testUserId, 'emails', 3)
    assert.equal(count, 3)
  })

  test('getUsage returns current count', async ({ assert }) => {
    const usage = await service.getUsage(testUserId, 'searches')
    assert.equal(usage, 2)
  })

  test('checkQuota returns allowed=false and correct quota when at limit', async ({ assert }) => {
    // At this point: searches used=2, limit=2 → at limit
    const result = await service.checkQuota(testUserId, PLAN_FREE, 'searches')
    assert.isFalse(result.allowed)
    assert.equal(result.quota.used, 2)
    assert.equal(result.quota.limit, FREE_QUOTAS.searches)
    assert.equal(result.quota.remaining, 0)
  })

  test('checkQuota returns allowed=true when under limit', async ({ assert }) => {
    // emails: used=3, limit=FREE_QUOTAS.emails(5) → under limit
    const result = await service.checkQuota(testUserId, PLAN_FREE, 'emails')
    assert.isTrue(result.allowed)
    assert.equal(result.quota.used, 3)
    assert.equal(result.quota.limit, FREE_QUOTAS.emails)
    assert.equal(result.quota.remaining, 2)
  })

  test('checkQuota always returns allowed=true for premium users', async ({ assert }) => {
    const result = await service.checkQuota(testUserId, PLAN_PREMIUM, 'searches')
    assert.isTrue(result.allowed)
    assert.isNull(result.quota.limit)
    assert.isNull(result.quota.remaining)
  })

  test('getRemainingQuota returns null limit/remaining for premium', async ({ assert }) => {
    const quota = await service.getRemainingQuota(testUserId, PLAN_PREMIUM, 'emails')
    assert.isNull(quota.limit)
    assert.isNull(quota.remaining)
  })

  test('getRemainingQuota returns correct values for free', async ({ assert }) => {
    const quota = await service.getRemainingQuota(testUserId, PLAN_FREE, 'emails')
    assert.equal(quota.used, 3)
    assert.equal(quota.limit, FREE_QUOTAS.emails)
    assert.equal(quota.remaining, 2)
  })
})
