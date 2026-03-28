import { test } from '@japa/runner'
import { TEST_USER_PASSWORD, TEST_USER_EMAIL } from '#tests/helpers/credentials'

const BASE_URL = '/api/admin/users'

test.group('Admin Users — Plan management', () => {
  let adminToken: string
  let testUserId: string

  test('setup: login as admin', async ({ client, assert }) => {
    const loginRes = await client.post('/api/auth/login').json({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    })
    loginRes.assertStatus(200)
    adminToken = loginRes.body().token
    testUserId = loginRes.body().user.id
    assert.ok(adminToken)
  })

  test('GET /api/admin/users includes plan field', async ({ client, assert }) => {
    const res = await client.get(BASE_URL).header('Authorization', `Bearer ${adminToken}`)
    res.assertStatus(200)

    const users = res.body().data
    assert.isArray(users)
    assert.isTrue(users.length > 0)

    const firstUser = users[0]
    assert.properties(firstUser, ['id', 'email', 'fullName', 'isAdmin', 'plan', 'createdAt'])
    assert.oneOf(firstUser.plan, ['free', 'premium'])
  })

  test('PATCH /api/admin/users/:id/plan toggles to premium', async ({ client, assert }) => {
    const res = await client
      .patch(`${BASE_URL}/${testUserId}/plan`)
      .header('Authorization', `Bearer ${adminToken}`)
      .json({ plan: 'premium' })

    res.assertStatus(200)
    assert.equal(res.body().data.plan, 'premium')
  })

  test('PATCH /api/admin/users/:id/plan toggles back to free', async ({ client, assert }) => {
    const res = await client
      .patch(`${BASE_URL}/${testUserId}/plan`)
      .header('Authorization', `Bearer ${adminToken}`)
      .json({ plan: 'free' })

    res.assertStatus(200)
    assert.equal(res.body().data.plan, 'free')
  })

  test('PATCH /api/admin/users/:id/plan rejects invalid plan', async ({ client }) => {
    const res = await client
      .patch(`${BASE_URL}/${testUserId}/plan`)
      .header('Authorization', `Bearer ${adminToken}`)
      .json({ plan: 'enterprise' })

    res.assertStatus(422)
  })

  test('PATCH /api/admin/users/:id/plan requires admin', async ({ client }) => {
    // Create non-admin user and try
    const registerRes = await client.post('/api/auth/register').json({
      email: 'nonadmin-plan-test@example.com',
      password: 'TestPassword123!',
      fullName: 'Non Admin',
    })

    if (registerRes.status() === 200) {
      const nonAdminToken = registerRes.body().token
      const res = await client
        .patch(`${BASE_URL}/${testUserId}/plan`)
        .header('Authorization', `Bearer ${nonAdminToken}`)
        .json({ plan: 'premium' })

      res.assertStatus(403)
    }
  })
})
