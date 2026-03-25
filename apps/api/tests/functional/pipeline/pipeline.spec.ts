import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'

const AUTH_URL = '/api/auth'
const PIPELINE_URL = '/api/pipeline'

const testUser = {
  email: 'pipeline-test@example.com',
  password: 'password123',
  fullName: 'Pipeline Test User',
}

async function createAuthenticatedUser(client: ApiClient) {
  const response = await client.post(`${AUTH_URL}/register`).json(testUser)
  return {
    token: response.body().token as string,
    userId: response.body().user.id as string,
  }
}

async function seedContact(
  userId: string,
  status: string,
  overrides?: Record<string, unknown>
) {
  const companyId = randomUUID()
  const now = new Date().toISOString()
  await db.table('companies').insert({
    id: companyId,
    name: `Company ${companyId.slice(0, 8)}`,
    country: 'NZ',
    source: 'manual',
    sector: 'technology',
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
    ...overrides,
  })

  return { contactId, companyId }
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
// GET /api/pipeline
// ---------------------------------------------------------------------------
test.group('GET /api/pipeline', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.get(PIPELINE_URL)
    response.assertStatus(401)
  })

  test('should return 200 with empty board structure', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client.get(PIPELINE_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const board = response.body().data
    assert.isArray(board)
    assert.lengthOf(board, 6)

    // Verify column keys
    const keys = board.map((col: { key: string }) => col.key)
    assert.deepEqual(keys, ['found', 'to_contact', 'contacted', 'in_discussion', 'interview', 'done'])

    // All counts should be 0
    for (const col of board) {
      assert.equal(col.count, 0)
      assert.isArray(col.contacts)
      assert.lengthOf(col.contacts, 0)
      assert.isArray(col.statuses)
    }
  })

  test('should place identified contacts in the found column', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    await seedContact(userId, 'identified')

    const response = await client.get(PIPELINE_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const board = response.body().data
    const foundCol = board.find((c: { key: string }) => c.key === 'found')
    assert.equal(foundCol.count, 1)
    assert.lengthOf(foundCol.contacts, 1)
  })

  test('should place analyzed contacts in the found column', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    await seedContact(userId, 'analyzed')

    const response = await client.get(PIPELINE_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const board = response.body().data
    const foundCol = board.find((c: { key: string }) => c.key === 'found')
    assert.equal(foundCol.count, 1)
  })

  test('should place to_contact contacts in the to_contact column', async ({
    client,
    assert,
  }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    await seedContact(userId, 'to_contact')

    const response = await client.get(PIPELINE_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const board = response.body().data
    const col = board.find((c: { key: string }) => c.key === 'to_contact')
    assert.equal(col.count, 1)
  })

  test('should place contacted contacts in the contacted column', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    await seedContact(userId, 'contacted')

    const response = await client.get(PIPELINE_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const board = response.body().data
    const col = board.find((c: { key: string }) => c.key === 'contacted')
    assert.equal(col.count, 1)
  })

  test('should place replied contacts in in_discussion and interview contacts in interview', async ({
    client,
    assert,
  }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    await seedContact(userId, 'replied')
    await seedContact(userId, 'interview')

    const response = await client.get(PIPELINE_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const board = response.body().data
    const inDiscussion = board.find((c: { key: string }) => c.key === 'in_discussion')
    assert.equal(inDiscussion.count, 1)
    const interviewCol = board.find((c: { key: string }) => c.key === 'interview')
    assert.equal(interviewCol.count, 1)
  })

  test('should place offer and rejected contacts in the done column', async ({
    client,
    assert,
  }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    await seedContact(userId, 'offer')
    await seedContact(userId, 'rejected')

    const response = await client.get(PIPELINE_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const board = response.body().data
    const col = board.find((c: { key: string }) => c.key === 'done')
    assert.equal(col.count, 2)
  })

  test('should distribute contacts across multiple columns', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    await seedContact(userId, 'identified')
    await seedContact(userId, 'analyzed')
    await seedContact(userId, 'to_contact')
    await seedContact(userId, 'contacted')
    await seedContact(userId, 'replied')

    const response = await client.get(PIPELINE_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const board = response.body().data
    assert.equal(board.find((c: { key: string }) => c.key === 'found').count, 2)
    assert.equal(board.find((c: { key: string }) => c.key === 'to_contact').count, 1)
    assert.equal(board.find((c: { key: string }) => c.key === 'contacted').count, 1)
    assert.equal(board.find((c: { key: string }) => c.key === 'in_discussion').count, 1)
    assert.equal(board.find((c: { key: string }) => c.key === 'done').count, 0)
  })

  test('should return correct contact shape with company data', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    await seedContact(userId, 'identified', {
      email: 'dev@company.nz',
      relevance_score: 85,
      relevance_label: 'very_relevant',
      relevance_reason: 'Strong match',
      ai_recommendation: 'contact',
    })

    const response = await client.get(PIPELINE_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const contact = response.body().data[0].contacts[0]
    assert.exists(contact.id)
    assert.exists(contact.fullName)
    assert.exists(contact.role)
    assert.equal(contact.email, 'dev@company.nz')
    assert.equal(contact.status, 'identified')
    assert.equal(contact.relevanceScore, 85)
    assert.equal(contact.relevanceLabel, 'very_relevant')
    assert.equal(contact.relevanceReason, 'Strong match')
    assert.equal(contact.aiRecommendation, 'contact')
    assert.exists(contact.company)
    assert.exists(contact.company.id)
    assert.exists(contact.company.name)
    assert.equal(contact.company.country, 'NZ')
  })

  test('should not return contacts belonging to another user', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    // Create another user's contacts directly
    const otherUserId = randomUUID()
    await db.table('users').insert({
      id: otherUserId,
      email: 'pipeline-other@example.com',
      password: 'hashed',
      full_name: 'Other',
      locale: 'en',
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    await seedContact(otherUserId, 'identified')

    const response = await client.get(PIPELINE_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const totalContacts = response
      .body()
      .data.reduce((sum: number, col: { count: number }) => sum + col.count, 0)
    assert.equal(totalContacts, 0)
  })
})

// ---------------------------------------------------------------------------
// GET /api/pipeline/stats
// ---------------------------------------------------------------------------
test.group('GET /api/pipeline/stats', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.get(`${PIPELINE_URL}/stats`)
    response.assertStatus(401)
  })

  test('should return 200 with empty stats when no contacts exist', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .get(`${PIPELINE_URL}/stats`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.exists(response.body().data)
    assert.isObject(response.body().data)
  })

  test('should return correct counts per status', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    await seedContact(userId, 'identified')
    await seedContact(userId, 'identified')
    await seedContact(userId, 'analyzed')
    await seedContact(userId, 'to_contact')

    const response = await client
      .get(`${PIPELINE_URL}/stats`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const stats = response.body().data
    assert.equal(stats.identified, 2)
    assert.equal(stats.analyzed, 1)
    assert.equal(stats.to_contact, 1)
  })

  test('should not count contacts from another user', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    // Create another user's contacts
    const otherUserId = randomUUID()
    await db.table('users').insert({
      id: otherUserId,
      email: 'stats-other@example.com',
      password: 'hashed',
      full_name: 'Other',
      locale: 'en',
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    await seedContact(otherUserId, 'identified')
    await seedContact(otherUserId, 'contacted')

    const response = await client
      .get(`${PIPELINE_URL}/stats`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const stats = response.body().data
    // Should have no stats for the current user
    assert.notExists(stats.identified)
    assert.notExists(stats.contacted)
  })
})
