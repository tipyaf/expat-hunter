import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'
import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'

const AUTH_URL = '/api/auth'

const adminUser = {
  email: 'admin-test@example.com',
  password: TEST_USER_PASSWORD,
  fullName: 'Admin Test',
}

const regularUser = {
  email: 'regular-test@example.com',
  password: TEST_USER_PASSWORD,
  fullName: 'Regular Test',
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

// ---------------------------------------------------------------------------
// Admin Middleware
// ---------------------------------------------------------------------------
test.group('Admin middleware', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 403 for non-admin user on ai-settings', async ({ client }) => {
    const { token } = await createUser(client, regularUser)
    const response = await client
      .get('/api/admin/ai-settings')
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(403)
  })

  test('should return 403 for non-admin user on users', async ({ client }) => {
    const { token } = await createUser(client, regularUser)
    const response = await client
      .get('/api/admin/users')
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(403)
  })

  test('should return 401 without auth', async ({ client }) => {
    const response = await client.get('/api/admin/ai-settings')
    response.assertStatus(401)
  })
})

// ---------------------------------------------------------------------------
// AI Settings CRUD
// ---------------------------------------------------------------------------
test.group('AI Settings CRUD', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('admin can list empty settings', async ({ client, assert }) => {
    const { token, userId } = await createUser(client, adminUser)
    await makeAdmin(userId)

    const response = await client
      .get('/api/admin/ai-settings')
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.lengthOf(response.body().data, 0)
  })

  test('admin can upsert a setting', async ({ client, assert }) => {
    const { token, userId } = await createUser(client, adminUser)
    await makeAdmin(userId)

    const response = await client
      .put('/api/admin/ai-settings/default')
      .header('Authorization', `Bearer ${token}`)
      .json({
        model: 'anthropic/claude-3-haiku',
        temperature: 0.5,
        maxTokens: 2048,
        isEnabled: true,
      })
    response.assertStatus(200)
    assert.equal(response.body().data.featureKey, 'default')
    assert.equal(response.body().data.model, 'anthropic/claude-3-haiku')
    assert.equal(response.body().data.temperature, 0.5)
    assert.equal(response.body().data.maxTokens, 2048)
  })

  test('admin can update existing setting', async ({ client, assert }) => {
    const { token, userId } = await createUser(client, adminUser)
    await makeAdmin(userId)

    await client
      .put('/api/admin/ai-settings/email_generation')
      .header('Authorization', `Bearer ${token}`)
      .json({ model: 'openai/gpt-4o-mini', temperature: 0.3 })

    const response = await client
      .put('/api/admin/ai-settings/email_generation')
      .header('Authorization', `Bearer ${token}`)
      .json({ model: 'openai/gpt-4o', temperature: 0.7 })

    response.assertStatus(200)
    assert.equal(response.body().data.model, 'openai/gpt-4o')
    assert.equal(response.body().data.temperature, 0.7)
  })

  test('should reject invalid feature key', async ({ client }) => {
    const { token, userId } = await createUser(client, adminUser)
    await makeAdmin(userId)

    const response = await client
      .put('/api/admin/ai-settings/invalid_key')
      .header('Authorization', `Bearer ${token}`)
      .json({ model: 'test' })
    response.assertStatus(400)
  })
})

// ---------------------------------------------------------------------------
// User Management
// ---------------------------------------------------------------------------
test.group('User Management', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('admin can list users', async ({ client, assert }) => {
    const { token, userId } = await createUser(client, adminUser)
    await makeAdmin(userId)
    await createUser(client, regularUser)

    const response = await client
      .get('/api/admin/users')
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.isAtLeast(response.body().data.length, 2)
  })

  test('admin can toggle user admin status', async ({ client, assert }) => {
    const { token, userId } = await createUser(client, adminUser)
    await makeAdmin(userId)
    const { userId: regularId } = await createUser(client, regularUser)

    const response = await client
      .patch(`/api/admin/users/${regularId}/admin`)
      .header('Authorization', `Bearer ${token}`)
      .json({ isAdmin: true })
    response.assertStatus(200)
    assert.equal(response.body().data.isAdmin, true)

    // Toggle back
    const response2 = await client
      .patch(`/api/admin/users/${regularId}/admin`)
      .header('Authorization', `Bearer ${token}`)
      .json({ isAdmin: false })
    response2.assertStatus(200)
    assert.equal(response2.body().data.isAdmin, false)
  })

  test('should return 404 for non-existent user', async ({ client }) => {
    const { token, userId } = await createUser(client, adminUser)
    await makeAdmin(userId)

    const response = await client
      .patch(`/api/admin/users/${randomUUID()}/admin`)
      .header('Authorization', `Bearer ${token}`)
      .json({ isAdmin: true })
    response.assertStatus(404)
  })

  test('should reject invalid isAdmin value', async ({ client }) => {
    const { token, userId } = await createUser(client, adminUser)
    await makeAdmin(userId)
    const { userId: regularId } = await createUser(client, regularUser)

    const response = await client
      .patch(`/api/admin/users/${regularId}/admin`)
      .header('Authorization', `Bearer ${token}`)
      .json({ isAdmin: 'yes' })
    response.assertStatus(422)
  })
})

// ---------------------------------------------------------------------------
// Auth returns isAdmin
// ---------------------------------------------------------------------------
test.group('Auth isAdmin field', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('register returns isAdmin false by default', async ({ client, assert }) => {
    const response = await client.post(`${AUTH_URL}/register`).json(regularUser)
    response.assertStatus(201)
    assert.equal(response.body().user.isAdmin, false)
  })

  test('login returns isAdmin true for admin user', async ({ client, assert }) => {
    const { userId } = await createUser(client, adminUser)
    await makeAdmin(userId)

    const response = await client
      .post(`${AUTH_URL}/login`)
      .json({ email: adminUser.email, password: adminUser.password })
    response.assertStatus(200)
    assert.equal(response.body().user.isAdmin, true)
  })

  test('me endpoint returns isAdmin', async ({ client, assert }) => {
    const { token, userId } = await createUser(client, adminUser)
    await makeAdmin(userId)

    const response = await client
      .get(`${AUTH_URL}/me`)
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)
    assert.equal(response.body().isAdmin, true)
  })
})
