import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTH_URL = '/api/auth'
const VISA_REGISTRIES_URL = '/api/admin/refresh-visa-registries'

const adminUser = {
  email: 'visa-admin-test@example.com',
  password: 'password123',
  fullName: 'Visa Admin Test',
}

const regularUser = {
  email: 'visa-regular-test@example.com',
  password: 'password123',
  fullName: 'Visa Regular Test',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  await db.from('external_cache').delete()
  await db.from('candidate_profiles').delete()
  await db.from('auth_access_tokens').delete()
  await db.from('users').delete()
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.group('POST /api/admin/refresh-visa-registries — auth & authorization', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('returns 401 when no authentication token is provided', async ({ client }) => {
    const response = await client.post(VISA_REGISTRIES_URL).json({})
    response.assertStatus(401)
  })

  test('returns 403 when authenticated as a regular (non-admin) user', async ({ client }) => {
    const { token } = await createUser(client, regularUser)
    const response = await client
      .post(VISA_REGISTRIES_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({})
    response.assertStatus(403)
  })

  test('returns 200 for admin user — responds gracefully even when Playwright is unavailable', async ({
    client,
  }) => {
    const { token, userId } = await createUser(client, adminUser)
    await makeAdmin(userId)

    // PLAYWRIGHT_SERVER_URL is not set in test env — NZ scraper returns graceful error
    // This validates that:
    //   1. Auth + admin enforcement works
    //   2. scrapeNzPage() try/finally does NOT throw (close() swallows errors)
    //   3. The endpoint returns 200 with a result object (not 500)
    const response = await client
      .post(VISA_REGISTRIES_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ countries: ['NZ'] })

    response.assertStatus(200)
    response.assertBodyContains({ results: { NZ: {} } })
  })
})
