import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import User from '#models/user'
import { getRedisClient } from '#config/limiter'
import { LOCKOUT_PREFIX, MAX_FAILED_LOGINS, LOCKOUT_DURATION_MINUTES } from '#constants/auth'

const BASE_URL = '/api/auth'

/**
 * Flush all rate limit and lockout keys from Redis.
 * Fails silently if Redis is not available.
 */
async function flushRateLimitKeys(): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return
  try {
    const keys = await redis.keys('rl:*')
    const lockKeys = await redis.keys('lockout:*')
    const allKeys = [...keys, ...lockKeys]
    if (allKeys.length > 0) {
      await redis.del(...allKeys)
    }
  } catch {
    // Redis not available
  }
}

test.group('Anti-bot: Honeypot', (group) => {
  group.each.setup(async () => {
    await db.from('auth_access_tokens').delete()
    await db.from('users').delete()
  })

  test('should silently reject registration when honeypot field is filled', async ({
    client,
    assert,
  }) => {
    const response = await client.post(`${BASE_URL}/register`).json({
      email: 'honeypot-test@example.com',
      password: TEST_USER_PASSWORD,
      fullName: 'Bot User',
      website: 'https://spam-bot.com',
    })

    // Returns fake 201 to not reveal the trap
    response.assertStatus(201)

    // But no user was actually created
    const users = await User.all()
    assert.equal(users.length, 0)
  })

  test('should allow registration when honeypot field is empty', async ({ client, assert }) => {
    const response = await client.post(`${BASE_URL}/register`).json({
      email: 'legit-user@example.com',
      password: TEST_USER_PASSWORD,
      fullName: 'Legit User',
    })

    response.assertStatus(201)
    assert.exists(response.body().token)

    const users = await User.all()
    assert.equal(users.length, 1)
  })
})

test.group('Anti-bot: Account lockout', (group) => {
  group.each.setup(async () => {
    await flushRateLimitKeys()
    await db.from('auth_access_tokens').delete()
    await db.from('users').delete()

    await User.create({
      email: 'lockout-test@example.com',
      password: TEST_USER_PASSWORD,
      fullName: 'Lockout Test',
      locale: 'en',
    })
  })

  group.teardown(async () => {
    await flushRateLimitKeys()
  })

  test('should lock account after MAX_FAILED_LOGINS failed attempts', async ({
    client,
    assert,
  }) => {
    const redis = getRedisClient()
    if (!redis) return

    // Simulate MAX_FAILED_LOGINS failed attempts by setting Redis key directly
    // (Rate limiter middleware is skipped in test env, but lockout logic is in controller)
    const lockoutKey = `${LOCKOUT_PREFIX}lockout-test@example.com`
    await redis.set(lockoutKey, String(MAX_FAILED_LOGINS), 'EX', LOCKOUT_DURATION_MINUTES * 60)

    // Next attempt (even with correct password) should be locked
    const response = await client.post(`${BASE_URL}/login`).json({
      email: 'lockout-test@example.com',
      password: TEST_USER_PASSWORD,
    })

    response.assertStatus(423)
    assert.equal(response.body().error.code, 'ACCOUNT_LOCKED')
    assert.exists(response.body().error.retryAfter)
  })

  test('should increment lockout counter on failed login', async ({ client, assert }) => {
    const redis = getRedisClient()
    if (!redis) return

    const lockoutKey = `${LOCKOUT_PREFIX}lockout-test@example.com`

    // One failed login
    await client.post(`${BASE_URL}/login`).json({
      email: 'lockout-test@example.com',
      password: 'wrongpassword123',
    })

    const count = await redis.get(lockoutKey)
    assert.equal(count, '1')
  })

  test('should clear lockout counter on successful login', async ({ client, assert }) => {
    const redis = getRedisClient()
    if (!redis) return

    const lockoutKey = `${LOCKOUT_PREFIX}lockout-test@example.com`

    // Set some failed attempts
    await redis.set(lockoutKey, '3', 'EX', LOCKOUT_DURATION_MINUTES * 60)

    // Successful login should clear the counter
    const response = await client.post(`${BASE_URL}/login`).json({
      email: 'lockout-test@example.com',
      password: TEST_USER_PASSWORD,
    })

    response.assertStatus(200)

    // Counter should be cleared
    const countAfter = await redis.get(lockoutKey)
    assert.isNull(countAfter)
  })
})
