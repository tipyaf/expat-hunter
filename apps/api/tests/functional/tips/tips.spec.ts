import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'
import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'

const AUTH_URL = '/api/auth'
const TIPS_URL = '/api/tips/contextual'

const testUser = {
  email: 'tips-test@example.com',
  password: TEST_USER_PASSWORD,
  fullName: 'Tips Test User',
}

async function createAuthenticatedUser(client: ApiClient) {
  const response = await client.post(`${AUTH_URL}/register`).json(testUser)
  return {
    token: response.body().token as string,
    userId: response.body().user.id as string,
  }
}

async function cleanupAll() {
  await db.from('candidate_profiles').delete()
  await db.from('auth_access_tokens').delete()
  await db.from('users').delete()
}

// ---------------------------------------------------------------------------
// GET /api/tips/contextual
// ---------------------------------------------------------------------------
test.group('GET /api/tips/contextual', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.get(TIPS_URL)
    response.assertStatus(401)
  })

  test('should return 200 with dashboard tip by default', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client.get(TIPS_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.exists(response.body().data)
  })

  test('should return a kanban tip when page=kanban', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .get(`${TIPS_URL}?page=kanban`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.exists(response.body().data)
  })

  test('should return a thread tip when page=thread', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .get(`${TIPS_URL}?page=thread`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.exists(response.body().data)
  })

  test('should return a profile tip when page=profile', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .get(`${TIPS_URL}?page=profile`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.exists(response.body().data)
  })
})
