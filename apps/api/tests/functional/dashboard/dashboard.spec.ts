import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'
import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'

const AUTH_URL = '/api/auth'
const DASHBOARD_URL = '/api/dashboard'

const testUser = {
  email: 'dashboard-test@example.com',
  password: TEST_USER_PASSWORD,
  fullName: 'Dashboard Test User',
}

async function createAuthenticatedUser(client: ApiClient) {
  const response = await client.post(`${AUTH_URL}/register`).json(testUser)
  return {
    token: response.body().token as string,
    userId: response.body().user.id as string,
  }
}

async function seedContact(userId: string, status: string) {
  const companyId = randomUUID()
  const now = new Date().toISOString()
  await db.table('companies').insert({
    id: companyId,
    name: `Company ${companyId.slice(0, 8)}`,
    country: 'NZ',
    source: 'manual',
    created_at: now,
    updated_at: now,
  })

  const contactId = randomUUID()
  await db.table('contacts').insert({
    id: contactId,
    user_id: userId,
    company_id: companyId,
    full_name: `Contact ${contactId.slice(0, 8)}`,
    role: 'Developer',
    source: 'manual',
    status,
    user_override: false,
    created_at: now,
    updated_at: now,
  })

  return { contactId, companyId }
}

async function seedDraftEmail(contactId: string) {
  const now = new Date().toISOString()
  await db.table('email_messages').insert({
    id: randomUUID(),
    contact_id: contactId,
    subject: 'Test subject',
    body: 'Test body',
    type: 'initial',
    status: 'draft',
    created_at: now,
    updated_at: now,
  })
}

async function cleanupAll() {
  await db.from('email_messages').delete()
  await db.from('contacts').delete()
  await db.from('companies').delete()
  await db.from('candidate_profiles').delete()
  await db.from('auth_access_tokens').delete()
  await db.from('users').delete()
}

// ---------------------------------------------------------------------------
// GET /api/dashboard/actions
// ---------------------------------------------------------------------------
test.group('GET /api/dashboard/actions', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.get(`${DASHBOARD_URL}/actions`)
    response.assertStatus(401)
  })

  test('should return empty actions for new user', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)
    const response = await client
      .get(`${DASHBOARD_URL}/actions`)
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.lengthOf(response.body().data, 0)
  })

  test('should return emails_to_validate action when drafts exist', async ({
    client,
    assert,
  }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedContact(userId, 'to_contact')
    await seedDraftEmail(contactId)

    const response = await client
      .get(`${DASHBOARD_URL}/actions`)
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)
    const actions = response.body().data
    const emailAction = actions.find(
      (a: { type: string }) => a.type === 'emails_to_validate'
    )
    assert.exists(emailAction)
    assert.equal(emailAction.count, 1)
  })

  test('should return replies_received action when contacts replied', async ({
    client,
    assert,
  }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    await seedContact(userId, 'replied')

    const response = await client
      .get(`${DASHBOARD_URL}/actions`)
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)
    const actions = response.body().data
    const replyAction = actions.find(
      (a: { type: string }) => a.type === 'replies_received'
    )
    assert.exists(replyAction)
    assert.equal(replyAction.count, 1)
  })
})

// ---------------------------------------------------------------------------
// GET /api/dashboard/stats
// ---------------------------------------------------------------------------
test.group('GET /api/dashboard/stats', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.get(`${DASHBOARD_URL}/stats`)
    response.assertStatus(401)
  })

  test('should return zero stats for new user', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)
    const response = await client
      .get(`${DASHBOARD_URL}/stats`)
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)
    const stats = response.body().data
    assert.equal(stats.contacts, 0)
    assert.equal(stats.emailsSent, 0)
    assert.equal(stats.replies, 0)
  })

  test('should return correct contact count', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    await seedContact(userId, 'identified')
    await seedContact(userId, 'analyzed')
    await seedContact(userId, 'replied')

    const response = await client
      .get(`${DASHBOARD_URL}/stats`)
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)
    const stats = response.body().data
    assert.equal(stats.contacts, 3)
    assert.equal(stats.replies, 1)
  })

  test('should not count other users contacts', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const otherUserId = randomUUID()
    const now = new Date().toISOString()
    await db.table('users').insert({
      id: otherUserId,
      email: 'other-dash@example.com',
      password: 'hashed',
      full_name: 'Other',
      locale: 'en',
      is_admin: false,
      created_at: now,
      updated_at: now,
    })
    await seedContact(otherUserId, 'identified')

    const response = await client
      .get(`${DASHBOARD_URL}/stats`)
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)
    assert.equal(response.body().data.contacts, 0)
  })
})
