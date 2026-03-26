import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'
import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import ImapSyncService from '#services/imap_sync_service'

const AUTH_URL = '/api/auth'

const testUser = {
  email: 'thread-test@example.com',
  password: TEST_USER_PASSWORD,
  fullName: 'Thread Test User',
}

async function createAuthenticatedUser(client: ApiClient) {
  const response = await client.post(`${AUTH_URL}/register`).json(testUser)
  return {
    token: response.body().token as string,
    userId: response.body().user.id as string,
  }
}

async function cleanupAll() {
  await db.from('email_replies').delete()
  await db.from('email_connections').delete()
  await db.from('email_messages').delete()
  await db.from('contact_movements').delete()
  await db.from('contacts').delete()
  await db.from('companies').delete()
  await db.from('candidate_profiles').delete()
  await db.from('auth_access_tokens').delete()
  await db.from('users').delete()
}

async function seedContact(userId: string, status = 'contacted') {
  const companyId = randomUUID()
  const now = new Date().toISOString()
  await db.table('companies').insert({
    id: companyId,
    name: `Company ${companyId.slice(0, 8)}`,
    country: 'NZ',
    source: 'seek',
    created_at: now,
    updated_at: now,
  })

  const contactId = randomUUID()
  await db.table('contacts').insert({
    id: contactId,
    user_id: userId,
    company_id: companyId,
    full_name: 'Jane Recruiter',
    role: 'Recruiter',
    email: 'jane@company.com',
    source: 'seek',
    status,
    user_override: false,
    created_at: now,
    updated_at: now,
  })

  return { contactId, companyId }
}

// ─── HTTP API tests ─────────────────────────────────────────────────────────

test.group('Thread API', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  // Thread endpoint
  test('GET /api/contacts/:id/thread → 401 without auth', async ({ client }) => {
    const id = randomUUID()
    const response = await client.get(`/api/contacts/${id}/thread`)
    response.assertStatus(401)
  })

  test('GET /api/contacts/:id/thread → 200 empty when no replies', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedContact(userId)

    const response = await client
      .get(`/api/contacts/${contactId}/thread`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const body = response.body() as { data: { replies: unknown[]; emails: unknown[]; summary: null } }
    assert.isArray(body.data.replies)
    assert.equal(body.data.replies.length, 0)
    assert.isArray(body.data.emails)
    assert.isNull(body.data.summary)
  })

  // Sync endpoint
  test('POST /api/contacts/:id/sync → 200 with { synced: 0 } (stub)', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedContact(userId)

    const response = await client
      .post(`/api/contacts/${contactId}/sync`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const body = response.body() as { data: { synced: number } }
    assert.equal(body.data.synced, 0)
  })

  // Reply generate endpoint
  test('POST /api/contacts/:id/reply/generate → 422 without replyId', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedContact(userId)

    const response = await client
      .post(`/api/contacts/${contactId}/reply/generate`)
      .header('Authorization', `Bearer ${token}`)
      .json({})

    response.assertStatus(422)
  })

  // Unread count
  test('GET /api/replies/unread-count → 401 without auth', async ({ client }) => {
    const response = await client.get('/api/replies/unread-count')
    response.assertStatus(401)
  })

  test('GET /api/replies/unread-count → 200 with count 0', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .get('/api/replies/unread-count')
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const body = response.body() as { data: { count: number } }
    assert.equal(body.data.count, 0)
  })

  // Email connections
  test('GET /api/email-connections → 401 without auth', async ({ client }) => {
    const response = await client.get('/api/email-connections')
    response.assertStatus(401)
  })

  test('GET /api/email-connections → 200 null when no connection', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .get('/api/email-connections')
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const body = response.body() as { data: null }
    assert.isNull(body.data)
  })

  test('POST /api/email-connections → 200 saves connection', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const payload = {
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapUser: 'user@example.com',
      imapPassword: 'secret',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpUser: 'user@example.com',
      smtpPassword: 'secret',
    }

    const response = await client
      .post('/api/email-connections')
      .header('Authorization', `Bearer ${token}`)
      .json(payload)

    response.assertStatus(200)
    const body = response.body() as { data: { imapHost: string; smtpHost: string } }
    assert.equal(body.data.imapHost, 'imap.example.com')
    assert.equal(body.data.smtpHost, 'smtp.example.com')
  })

  test('DELETE /api/email-connections → 200 deletes connection', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    // First create one
    await client
      .post('/api/email-connections')
      .header('Authorization', `Bearer ${token}`)
      .json({
        imapHost: 'imap.example.com',
        imapPort: 993,
        imapUser: 'user@example.com',
        imapPassword: 'secret',
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: 'user@example.com',
        smtpPassword: 'secret',
      })

    const deleteResponse = await client
      .delete('/api/email-connections')
      .header('Authorization', `Bearer ${token}`)

    deleteResponse.assertStatus(200)

    // Verify it's gone
    const getResponse = await client
      .get('/api/email-connections')
      .header('Authorization', `Bearer ${token}`)

    const body = getResponse.body() as { data: null }
    assert.isNull(body.data)
  })
})

// ─── ImapSyncService unit tests ──────────────────────────────────────────────

test.group('ImapSyncService.processReply', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  async function setupUserAndContact(client: ApiClient) {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedContact(userId, 'contacted')
    return { userId, contactId, token }
  }

  test('processReply with "interview" body → contact status becomes "interview"', async ({
    client,
    assert,
  }) => {
    const { userId, contactId } = await setupUserAndContact(client)
    const service = new ImapSyncService()

    await service.processReply(userId, {
      contactId,
      fromEmail: 'recruiter@company.com',
      subject: 'Invitation à un entretien',
      bodyText: 'We would like to invite you for an interview next week.',
      receivedAt: new Date(),
    })

    const contact = await db.from('contacts').where('id', contactId).first()
    assert.equal(contact.status, 'interview')
  })

  test('processReply with "not moving forward" body → contact status becomes "rejected"', async ({
    client,
    assert,
  }) => {
    const { userId, contactId } = await setupUserAndContact(client)
    const service = new ImapSyncService()

    await service.processReply(userId, {
      contactId,
      fromEmail: 'hr@company.com',
      subject: 'Re: Your application',
      bodyText: 'Unfortunately we are not moving forward with your application at this time.',
      receivedAt: new Date(),
    })

    const contact = await db.from('contacts').where('id', contactId).first()
    assert.equal(contact.status, 'rejected')
  })

  test('processReply with "offer" body → contact status becomes "offer"', async ({
    client,
    assert,
  }) => {
    const { userId, contactId } = await setupUserAndContact(client)
    const service = new ImapSyncService()

    await service.processReply(userId, {
      contactId,
      fromEmail: 'cto@company.com',
      subject: 'Job offer for you',
      bodyText: 'We are pleased to extend an offer for the position.',
      receivedAt: new Date(),
    })

    const contact = await db.from('contacts').where('id', contactId).first()
    assert.equal(contact.status, 'offer')
  })

  test('processReply with other body → contact status becomes "replied"', async ({
    client,
    assert,
  }) => {
    const { userId, contactId } = await setupUserAndContact(client)
    const service = new ImapSyncService()

    await service.processReply(userId, {
      contactId,
      fromEmail: 'recruiter@company.com',
      subject: 'Re: Your message',
      bodyText: 'Thank you for reaching out. We will be in touch soon.',
      receivedAt: new Date(),
    })

    const contact = await db.from('contacts').where('id', contactId).first()
    assert.equal(contact.status, 'replied')
  })
})
