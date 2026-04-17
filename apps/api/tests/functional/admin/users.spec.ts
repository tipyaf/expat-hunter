import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'
import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'

const BASE_URL = '/api/admin/users'
const AUTH_URL = '/api/auth'

const adminUser = {
  email: 'admin-plan-test@example.com',
  password: TEST_USER_PASSWORD,
  fullName: 'Admin Plan Test',
}

async function createUser(client: ApiClient, data: typeof adminUser) {
  const response = await client.post(`${AUTH_URL}/register`).json(data)
  return {
    token: response.body().token as string,
    userId: response.body().user.id as string,
  }
}

async function makeAdmin(userId: string) {
  await db.from('users').where('id', userId).update({ is_admin: true })
}

async function cleanupAll() {
  await db.from('ai_settings').delete()
  await db.from('email_messages').delete()
  await db.from('contacts').delete()
  await db.from('companies').delete()
  await db.from('candidate_profiles').delete()
  await db.from('auth_access_tokens').delete()
  await db.from('users').delete()
}

test.group('Admin Users — Plan management', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('GET /api/admin/users includes plan field', async ({ client, assert }) => {
    const { token, userId } = await createUser(client, adminUser)
    await makeAdmin(userId)

    const res = await client.get(BASE_URL).header('Authorization', `Bearer ${token}`)
    res.assertStatus(200)

    const users = res.body().data
    assert.isArray(users)
    assert.isTrue(users.length > 0)

    const firstUser = users[0]
    assert.properties(firstUser, ['id', 'email', 'fullName', 'isAdmin', 'plan', 'createdAt'])
    assert.oneOf(firstUser.plan, ['free', 'premium'])
  })

  test('PATCH /api/admin/users/:id/plan toggles to premium', async ({ client, assert }) => {
    const { token, userId } = await createUser(client, adminUser)
    await makeAdmin(userId)

    const res = await client
      .patch(`${BASE_URL}/${userId}/plan`)
      .header('Authorization', `Bearer ${token}`)
      .json({ plan: 'premium' })

    res.assertStatus(200)
    assert.equal(res.body().data.plan, 'premium')
  })

  test('PATCH /api/admin/users/:id/plan toggles back to free', async ({ client, assert }) => {
    const { token, userId } = await createUser(client, adminUser)
    await makeAdmin(userId)

    // First promote to premium so the toggle-back assertion is meaningful.
    await client
      .patch(`${BASE_URL}/${userId}/plan`)
      .header('Authorization', `Bearer ${token}`)
      .json({ plan: 'premium' })

    const res = await client
      .patch(`${BASE_URL}/${userId}/plan`)
      .header('Authorization', `Bearer ${token}`)
      .json({ plan: 'free' })

    res.assertStatus(200)
    assert.equal(res.body().data.plan, 'free')
  })

  test('PATCH /api/admin/users/:id/plan rejects invalid plan', async ({ client }) => {
    const { token, userId } = await createUser(client, adminUser)
    await makeAdmin(userId)

    const res = await client
      .patch(`${BASE_URL}/${userId}/plan`)
      .header('Authorization', `Bearer ${token}`)
      .json({ plan: 'enterprise' })

    res.assertStatus(422)
  })

  test('PATCH /api/admin/users/:id/plan requires admin', async ({ client }) => {
    // Register a non-admin; attempting the admin endpoint must be rejected.
    const { token, userId } = await createUser(client, {
      email: 'nonadmin-plan-test@example.com',
      password: TEST_USER_PASSWORD,
      fullName: 'Non Admin',
    })

    const res = await client
      .patch(`${BASE_URL}/${userId}/plan`)
      .header('Authorization', `Bearer ${token}`)
      .json({ plan: 'premium' })

    res.assertStatus(403)
  })
})
