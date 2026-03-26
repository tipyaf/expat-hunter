import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'
import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'

const AUTH_URL = '/api/auth'
const EMAILS_URL = '/api/emails'

const testUser = {
  email: 'email-test@example.com',
  password: TEST_USER_PASSWORD,
  fullName: 'Email Test User',
}

async function createAuthenticatedUser(client: ApiClient) {
  const response = await client.post(`${AUTH_URL}/register`).json(testUser)
  return {
    token: response.body().token as string,
    userId: response.body().user.id as string,
  }
}

async function seedCompanyAndContact(userId: string) {
  const companyId = randomUUID()
  const now = new Date().toISOString()
  await db.table('companies').insert({
    id: companyId,
    name: 'Test Corp',
    country: 'NZ',
    source: 'manual',
    sector: 'technology',
    city: 'Auckland',
    created_at: now,
    updated_at: now,
  })

  const contactId = randomUUID()
  await db.table('contacts').insert({
    id: contactId,
    user_id: userId,
    company_id: companyId,
    full_name: 'Jane Contact',
    role: 'CTO',
    email: 'jane@testcorp.nz',
    source: 'manual',
    status: 'to_contact',
    ai_recommendation: 'contact',
    user_override: false,
    created_at: now,
    updated_at: now,
  })

  return { companyId, contactId }
}

async function seedEmailMessage(contactId: string, overrides?: Record<string, unknown>) {
  const emailId = randomUUID()
  const now = new Date().toISOString()
  await db.table('email_messages').insert({
    id: emailId,
    contact_id: contactId,
    subject: 'Test subject',
    body: 'Test body content',
    type: 'initial',
    status: 'draft',
    created_at: now,
    updated_at: now,
    ...overrides,
  })
  return emailId
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
// GET /api/emails
// ---------------------------------------------------------------------------
test.group('GET /api/emails', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.get(EMAILS_URL)
    response.assertStatus(401)
  })

  test('should return 200 with empty list when no emails exist', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client.get(EMAILS_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.lengthOf(response.body().data, 0)
    assert.exists(response.body().meta)
  })

  test('should return paginated emails for current user', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedCompanyAndContact(userId)
    await seedEmailMessage(contactId)

    const response = await client.get(EMAILS_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.lengthOf(response.body().data, 1)

    const email = response.body().data[0]
    assert.exists(email.id)
    assert.exists(email.subject)
    assert.exists(email.body)
    assert.equal(email.type, 'initial')
    assert.equal(email.status, 'draft')
    assert.exists(email.contact)
    assert.equal(email.contact.fullName, 'Jane Contact')
  })

  test('should filter by status', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedCompanyAndContact(userId)
    await seedEmailMessage(contactId, { status: 'draft' })
    await seedEmailMessage(contactId, { status: 'approved' })

    const draftResponse = await client
      .get(`${EMAILS_URL}?status=draft`)
      .header('Authorization', `Bearer ${token}`)

    draftResponse.assertStatus(200)
    assert.lengthOf(draftResponse.body().data, 1)
    assert.equal(draftResponse.body().data[0].status, 'draft')
  })

  test('should filter by contact_id', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedCompanyAndContact(userId)
    await seedEmailMessage(contactId)

    const response = await client
      .get(`${EMAILS_URL}?contact_id=${contactId}`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 1)
  })

  test('should respect pagination parameters', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedCompanyAndContact(userId)
    await seedEmailMessage(contactId)
    await seedEmailMessage(contactId, { subject: 'Second email' })
    await seedEmailMessage(contactId, { subject: 'Third email' })

    const response = await client
      .get(`${EMAILS_URL}?page=1&limit=2`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 2)
    assert.exists(response.body().meta)
  })

  test('should not return emails belonging to another user', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    // Create a separate user's data directly
    const otherUserId = randomUUID()
    await db.table('users').insert({
      id: otherUserId,
      email: 'other@example.com',
      password: 'hashed',
      full_name: 'Other User',
      locale: 'en',
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const otherCompanyId = randomUUID()
    await db.table('companies').insert({
      id: otherCompanyId,
      name: 'Other Corp',
      country: 'AU',
      source: 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const otherContactId = randomUUID()
    await db.table('contacts').insert({
      id: otherContactId,
      user_id: otherUserId,
      company_id: otherCompanyId,
      full_name: 'Other Contact',
      role: 'CEO',
      source: 'manual',
      status: 'identified',
      user_override: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    await seedEmailMessage(otherContactId)

    const response = await client.get(EMAILS_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 0)
  })
})

// ---------------------------------------------------------------------------
// GET /api/emails/:id
// ---------------------------------------------------------------------------
test.group('GET /api/emails/:id', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.get(`${EMAILS_URL}/${randomUUID()}`)
    response.assertStatus(401)
  })

  test('should return 404 for non-existent email', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .get(`${EMAILS_URL}/${randomUUID()}`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(404)
    assert.exists(response.body().error)
  })

  test('should return 200 with email data', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedCompanyAndContact(userId)
    const emailId = await seedEmailMessage(contactId)

    const response = await client
      .get(`${EMAILS_URL}/${emailId}`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const data = response.body().data
    assert.equal(data.id, emailId)
    assert.equal(data.subject, 'Test subject')
    assert.equal(data.body, 'Test body content')
    assert.equal(data.type, 'initial')
    assert.equal(data.status, 'draft')
    assert.exists(data.contact)
    assert.exists(data.contact.company)
  })

  test('should return 404 when email belongs to another user', async ({ client }) => {
    const { token } = await createAuthenticatedUser(client)

    // Create another user's email
    const otherUserId = randomUUID()
    await db.table('users').insert({
      id: otherUserId,
      email: 'other2@example.com',
      password: 'hashed',
      full_name: 'Other User',
      locale: 'en',
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const companyId = randomUUID()
    await db.table('companies').insert({
      id: companyId,
      name: 'OtherCo',
      country: 'AU',
      source: 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const otherContactId = randomUUID()
    await db.table('contacts').insert({
      id: otherContactId,
      user_id: otherUserId,
      company_id: companyId,
      full_name: 'Other',
      role: 'Dev',
      source: 'manual',
      status: 'identified',
      user_override: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const emailId = await seedEmailMessage(otherContactId)

    const response = await client
      .get(`${EMAILS_URL}/${emailId}`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(404)
  })
})

// ---------------------------------------------------------------------------
// PUT /api/emails/:id
// ---------------------------------------------------------------------------
test.group('PUT /api/emails/:id', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.put(`${EMAILS_URL}/${randomUUID()}`).json({ subject: 'New' })
    response.assertStatus(401)
  })

  test('should return 404 for non-existent email', async ({ client }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .put(`${EMAILS_URL}/${randomUUID()}`)
      .header('Authorization', `Bearer ${token}`)
      .json({ subject: 'Updated' })

    response.assertStatus(404)
  })

  test('should update subject and body of a draft email', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedCompanyAndContact(userId)
    const emailId = await seedEmailMessage(contactId)

    const response = await client
      .put(`${EMAILS_URL}/${emailId}`)
      .header('Authorization', `Bearer ${token}`)
      .json({ subject: 'Updated subject', body: 'Updated body' })

    response.assertStatus(200)
    assert.equal(response.body().data.subject, 'Updated subject')
    assert.equal(response.body().data.body, 'Updated body')
  })

  test('should update only subject if body not provided', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedCompanyAndContact(userId)
    const emailId = await seedEmailMessage(contactId)

    const response = await client
      .put(`${EMAILS_URL}/${emailId}`)
      .header('Authorization', `Bearer ${token}`)
      .json({ subject: 'Only subject updated' })

    response.assertStatus(200)
    assert.equal(response.body().data.subject, 'Only subject updated')
    assert.equal(response.body().data.body, 'Test body content')
  })

  test('should return 400 when email is not a draft', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedCompanyAndContact(userId)
    const emailId = await seedEmailMessage(contactId, { status: 'approved' })

    const response = await client
      .put(`${EMAILS_URL}/${emailId}`)
      .header('Authorization', `Bearer ${token}`)
      .json({ subject: 'Attempt update' })

    response.assertStatus(400)
    assert.equal(response.body().error.code, 'NOT_DRAFT')
  })

  test('should return 400 when email status is sent', async ({ client }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedCompanyAndContact(userId)
    const emailId = await seedEmailMessage(contactId, { status: 'sent' })

    const response = await client
      .put(`${EMAILS_URL}/${emailId}`)
      .header('Authorization', `Bearer ${token}`)
      .json({ subject: 'Attempt' })

    response.assertStatus(400)
  })
})

// ---------------------------------------------------------------------------
// POST /api/emails/:id/approve
// ---------------------------------------------------------------------------
test.group('POST /api/emails/:id/approve', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.post(`${EMAILS_URL}/${randomUUID()}/approve`)
    response.assertStatus(401)
  })

  test('should return 404 for non-existent email', async ({ client }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .post(`${EMAILS_URL}/${randomUUID()}/approve`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(404)
  })

  test('should approve a draft email', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedCompanyAndContact(userId)
    const emailId = await seedEmailMessage(contactId)

    const response = await client
      .post(`${EMAILS_URL}/${emailId}/approve`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.equal(response.body().data.status, 'approved')
  })

  test('should return 400 when approving a non-draft email', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedCompanyAndContact(userId)
    const emailId = await seedEmailMessage(contactId, { status: 'sent' })

    const response = await client
      .post(`${EMAILS_URL}/${emailId}/approve`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(400)
    assert.equal(response.body().error.code, 'NOT_DRAFT')
  })
})

// ---------------------------------------------------------------------------
// POST /api/emails/:id/reject
// ---------------------------------------------------------------------------
test.group('POST /api/emails/:id/reject', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.post(`${EMAILS_URL}/${randomUUID()}/reject`)
    response.assertStatus(401)
  })

  test('should return 404 for non-existent email', async ({ client }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .post(`${EMAILS_URL}/${randomUUID()}/reject`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(404)
  })

  test('should reject (delete) a draft email', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedCompanyAndContact(userId)
    const emailId = await seedEmailMessage(contactId)

    const response = await client
      .post(`${EMAILS_URL}/${emailId}/reject`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.isTrue(response.body().data.deleted)

    // Verify it's actually deleted
    const checkResponse = await client
      .get(`${EMAILS_URL}/${emailId}`)
      .header('Authorization', `Bearer ${token}`)

    checkResponse.assertStatus(404)
  })

  test('should return 400 when rejecting a non-draft email', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedCompanyAndContact(userId)
    const emailId = await seedEmailMessage(contactId, { status: 'approved' })

    const response = await client
      .post(`${EMAILS_URL}/${emailId}/reject`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(400)
    assert.equal(response.body().error.code, 'NOT_DRAFT')
  })
})

// ---------------------------------------------------------------------------
// POST /api/emails/generate
// ---------------------------------------------------------------------------
test.group('POST /api/emails/generate', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.post(`${EMAILS_URL}/generate`)
    response.assertStatus(401)
  })

  test('should return 200 with generation result (0 generated when AI not configured)', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .post(`${EMAILS_URL}/generate`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const data = response.body().data
    assert.exists(data)
    assert.isNumber(data.generated)
    assert.isNumber(data.errors)
    assert.isNumber(data.skipped)
    assert.isArray(data.emailIds)
  })

  test('should accept contactIds parameter', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .post(`${EMAILS_URL}/generate`)
      .header('Authorization', `Bearer ${token}`)
      .json({ contactIds: [randomUUID()], batchSize: 5 })

    response.assertStatus(200)
    assert.equal(response.body().data.generated, 0)
  })
})

// ---------------------------------------------------------------------------
// POST /api/emails/:id/regenerate
// ---------------------------------------------------------------------------
test.group('POST /api/emails/:id/regenerate', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.post(`${EMAILS_URL}/${randomUUID()}/regenerate`)
    response.assertStatus(401)
  })

  test('should return 400 when AI is not configured (regenerate fails)', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedCompanyAndContact(userId)
    const emailId = await seedEmailMessage(contactId)

    const response = await client
      .post(`${EMAILS_URL}/${emailId}/regenerate`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(400)
    assert.equal(response.body().error.code, 'REGENERATE_FAILED')
  })
})

// ---------------------------------------------------------------------------
// POST /api/emails/approve-batch
// ---------------------------------------------------------------------------
test.group('POST /api/emails/approve-batch', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client
      .post(`${EMAILS_URL}/approve-batch`)
      .json({ emailIds: [randomUUID()] })
    response.assertStatus(401)
  })

  test('should return 400 when emailIds is missing', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .post(`${EMAILS_URL}/approve-batch`)
      .header('Authorization', `Bearer ${token}`)
      .json({})

    response.assertStatus(400)
    assert.equal(response.body().error.code, 'INVALID_IDS')
  })

  test('should return 400 when emailIds is an empty array', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .post(`${EMAILS_URL}/approve-batch`)
      .header('Authorization', `Bearer ${token}`)
      .json({ emailIds: [] })

    response.assertStatus(400)
    assert.equal(response.body().error.code, 'INVALID_IDS')
  })

  test('should return 400 when emailIds is not an array', async ({ client }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .post(`${EMAILS_URL}/approve-batch`)
      .header('Authorization', `Bearer ${token}`)
      .json({ emailIds: 'not-an-array' })

    response.assertStatus(400)
  })

  test('should approve multiple draft emails', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedCompanyAndContact(userId)
    const emailId1 = await seedEmailMessage(contactId, { subject: 'Email 1' })
    const emailId2 = await seedEmailMessage(contactId, { subject: 'Email 2' })

    const response = await client
      .post(`${EMAILS_URL}/approve-batch`)
      .header('Authorization', `Bearer ${token}`)
      .json({ emailIds: [emailId1, emailId2] })

    response.assertStatus(200)
    assert.equal(response.body().data.approved, 2)

    // Verify both are now approved
    const check1 = await client
      .get(`${EMAILS_URL}/${emailId1}`)
      .header('Authorization', `Bearer ${token}`)
    assert.equal(check1.body().data.status, 'approved')

    const check2 = await client
      .get(`${EMAILS_URL}/${emailId2}`)
      .header('Authorization', `Bearer ${token}`)
    assert.equal(check2.body().data.status, 'approved')
  })

  test('should only approve draft emails and ignore non-draft', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedCompanyAndContact(userId)
    const draftEmailId = await seedEmailMessage(contactId, { status: 'draft' })
    const sentEmailId = await seedEmailMessage(contactId, { status: 'sent' })

    const response = await client
      .post(`${EMAILS_URL}/approve-batch`)
      .header('Authorization', `Bearer ${token}`)
      .json({ emailIds: [draftEmailId, sentEmailId] })

    response.assertStatus(200)
    assert.equal(response.body().data.approved, 1)
  })

  test('should not approve emails belonging to another user', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    // Create another user's email
    const otherUserId = randomUUID()
    await db.table('users').insert({
      id: otherUserId,
      email: 'batch-other@example.com',
      password: 'hashed',
      full_name: 'Other',
      locale: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const companyId = randomUUID()
    await db.table('companies').insert({
      id: companyId,
      name: 'OtherCo',
      country: 'AU',
      source: 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const otherContactId = randomUUID()
    await db.table('contacts').insert({
      id: otherContactId,
      user_id: otherUserId,
      company_id: companyId,
      full_name: 'Other',
      role: 'Dev',
      source: 'manual',
      status: 'identified',
      user_override: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const otherEmailId = await seedEmailMessage(otherContactId)

    const response = await client
      .post(`${EMAILS_URL}/approve-batch`)
      .header('Authorization', `Bearer ${token}`)
      .json({ emailIds: [otherEmailId] })

    response.assertStatus(200)
    assert.equal(response.body().data.approved, 0)
  })
})
