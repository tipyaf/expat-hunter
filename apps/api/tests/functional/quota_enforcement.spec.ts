import { test } from '@japa/runner'
import User from '#models/user'
import UsageCounter from '#models/usage_counter'
import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'
import { FREE_QUOTAS } from '@expat-hunter/shared'

test.group('Quota enforcement', () => {
  const TEST_EMAIL = 'quota-enforcement-test@example.com'
  let token: string
  let userId: string

  test('setup: create free user', async ({ client, assert }) => {
    const res = await client.post('/api/auth/register').json({
      email: TEST_EMAIL,
      password: TEST_USER_PASSWORD,
      fullName: 'Quota Test User',
    })

    if (res.status() === 200) {
      token = res.body().token
      userId = res.body().user.id
    } else {
      const loginRes = await client.post('/api/auth/login').json({
        email: TEST_EMAIL,
        password: TEST_USER_PASSWORD,
      })
      loginRes.assertStatus(200)
      token = loginRes.body().token
      userId = loginRes.body().user.id
    }

    // Ensure user is free
    const user = await User.findOrFail(userId)
    user.plan = 'free'
    await user.save()

    // Clean any existing usage counters
    await UsageCounter.query().where('userId', userId).delete()

    assert.ok(token)
  })

  test('sourcing: free user with searches at limit gets 403 QUOTA_EXCEEDED', async ({ client }) => {
    // Set searches to limit
    await UsageCounter.firstOrCreate(
      { userId, counterType: 'searches' },
      { userId, counterType: 'searches', count: FREE_QUOTAS.searches }
    )

    const res = await client
      .post('/api/sourcing/run')
      .header('Authorization', `Bearer ${token}`)
      .json({ country: 'NZ' })

    res.assertStatus(403)
    res.assertBodyContains({ error: { code: 'QUOTA_EXCEEDED' } })
  })

  test('emails: free user with emails at limit gets 403 QUOTA_EXCEEDED', async ({ client }) => {
    // Set emails to limit
    await UsageCounter.firstOrCreate(
      { userId, counterType: 'emails' },
      { userId, counterType: 'emails', count: FREE_QUOTAS.emails }
    )

    const res = await client
      .post('/api/emails/generate')
      .header('Authorization', `Bearer ${token}`)
      .json({})

    res.assertStatus(403)
    res.assertBodyContains({ error: { code: 'QUOTA_EXCEEDED' } })
  })

  test('chat: free user with chatQuestions at limit gets 403 QUOTA_EXCEEDED', async ({ client }) => {
    // Set chatQuestions to limit
    await UsageCounter.firstOrCreate(
      { userId, counterType: 'chatQuestions' },
      { userId, counterType: 'chatQuestions', count: FREE_QUOTAS.chatQuestions }
    )

    const res = await client
      .post('/api/assistant/chat')
      .header('Authorization', `Bearer ${token}`)
      .json({ message: 'hello', sessionId: 'test-session-quota' })

    res.assertStatus(403)
    res.assertBodyContains({ error: { code: 'QUOTA_EXCEEDED' } })
  })

  test('premium user bypasses all quotas', async ({ client }) => {
    // Upgrade to premium
    const user = await User.findOrFail(userId)
    user.plan = 'premium'
    await user.save()

    // Chat should work even with maxed out counters
    const res = await client
      .post('/api/assistant/chat')
      .header('Authorization', `Bearer ${token}`)
      .json({ message: 'help', sessionId: 'test-session-premium' })

    // Should not be 403 — may be 200 or 500 (if OpenRouter not configured) but NOT 403
    const status = res.status()
    if (status === 403) {
      throw new Error('Premium user should NOT get 403 QUOTA_EXCEEDED')
    }

    // Reset to free
    user.plan = 'free'
    await user.save()
  })

  test('quota response includes used/limit/remaining', async ({ client, assert }) => {
    // Reset counters
    await UsageCounter.query().where('userId', userId).delete()

    // Chat should work and return quota info
    const res = await client
      .post('/api/assistant/chat')
      .header('Authorization', `Bearer ${token}`)
      .json({ message: 'comment lancer une recherche', sessionId: 'test-session-quota-info' })

    res.assertStatus(200)
    const body = res.body()
    assert.property(body, 'quota')
    assert.property(body.quota, 'used')
    assert.property(body.quota, 'limit')
    assert.property(body.quota, 'remaining')
    assert.equal(body.quota.limit, FREE_QUOTAS.chatQuestions)
  })

  test('cleanup', async () => {
    await UsageCounter.query().where('userId', userId).delete()
    const user = await User.find(userId)
    if (user) await user.delete()
  })
})
