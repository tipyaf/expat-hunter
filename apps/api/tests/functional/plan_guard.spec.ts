import { test } from '@japa/runner'
import User from '#models/user'
import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'

test.group('PlanGuard middleware', () => {
  const TEST_EMAIL = 'plan-guard-test@example.com'
  let freeUserToken: string
  let userId: string

  test('setup: create free user', async ({ client, assert }) => {
    const res = await client.post('/api/auth/register').json({
      email: TEST_EMAIL,
      password: TEST_USER_PASSWORD,
      fullName: 'Plan Guard Test',
    })

    if (res.status() === 200) {
      freeUserToken = res.body().token
      userId = res.body().user.id
    } else {
      // User already exists, login
      const loginRes = await client.post('/api/auth/login').json({
        email: TEST_EMAIL,
        password: TEST_USER_PASSWORD,
      })
      loginRes.assertStatus(200)
      freeUserToken = loginRes.body().token
      userId = loginRes.body().user.id
    }

    // Ensure user is free
    const user = await User.findOrFail(userId)
    user.plan = 'free'
    await user.save()

    assert.ok(freeUserToken)
  })

  test('free user accessing pipeline route gets 200 (gate is frontend-only)', async ({ client }) => {
    const res = await client
      .get('/api/pipeline')
      .header('Authorization', `Bearer ${freeUserToken}`)

    // Pipeline data loads for all users — PremiumGate handles UI blocking
    res.assertStatus(200)
  })

  test('unauthenticated user accessing pipeline route gets 401', async ({ client }) => {
    const res = await client.get('/api/pipeline')
    res.assertStatus(401)
  })

  test('cleanup', async () => {
    const user = await User.find(userId)
    if (user) await user.delete()
  })
})
