/**
 * Functional test — sc-496
 * Verifies that placeholder contacts (e.g. "Hiring Manager") are excluded from API responses
 * but remain in the database for enrichment pipeline use.
 */
import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'
import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'

const AUTH_URL = '/api/auth'

const testUser = {
  email: 'placeholder-filter-test@example.com',
  password: TEST_USER_PASSWORD,
  fullName: 'Placeholder Filter Test User',
}

async function createAuthenticatedUser(client: ApiClient) {
  const response = await client.post(`${AUTH_URL}/register`).json(testUser)
  return {
    token: response.body().token as string,
    userId: response.body().user.id as string,
  }
}

async function cleanupAll() {
  await db.from('email_messages').delete()
  await db.from('contacts').delete()
  await db.from('companies').delete()
  await db.from('candidate_profiles').delete()
  await db.from('auth_access_tokens').delete()
  await db.from('users').delete()
}

async function seedContact(
  userId: string,
  fullName: string,
  overrides: Record<string, unknown> = {}
) {
  const companyId = randomUUID()
  const now = new Date().toISOString()
  await db.table('companies').insert({
    id: companyId,
    name: `Company ${companyId.slice(0, 8)}`,
    country: 'NZ',
    source: 'seek',
    website: null,
    sector: null,
    city: null,
    created_at: now,
    updated_at: now,
  })

  const contactId = randomUUID()
  await db.table('contacts').insert({
    id: contactId,
    user_id: userId,
    company_id: companyId,
    full_name: fullName,
    role: overrides.role ?? 'Developer',
    email: overrides.email ?? null,
    linkedin_url: null,
    source: 'seek',
    status: 'identified',
    relevance_score: null,
    relevance_label: null,
    user_override: false,
    created_at: now,
    updated_at: now,
  })

  return { contactId, companyId }
}

test.group('Contacts API — Placeholder filter (sc-496)', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  group.teardown(async () => {
    await cleanupAll()
  })

  test('GET /api/contacts excludes "Hiring Manager" placeholders', async ({
    client,
    assert,
  }) => {
    const { token, userId } = await createAuthenticatedUser(client)

    await seedContact(userId, 'Hiring Manager')
    await seedContact(userId, 'Jane Smith', { email: 'jane@acme.com' })

    const response = await client
      .get('/api/contacts')
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const contacts = response.body().data
    assert.equal(contacts.length, 1)
    assert.equal(contacts[0].fullName, 'Jane Smith')
  })

  test('GET /api/contacts excludes all generic placeholder names', async ({
    client,
    assert,
  }) => {
    const { token, userId } = await createAuthenticatedUser(client)

    await seedContact(userId, 'hiring manager')
    await seedContact(userId, 'recruiter')
    await seedContact(userId, 'unknown')
    await seedContact(userId, 'Real Person', { email: 'real@company.com' })
    await seedContact(userId, 'Another Human', { email: 'another@company.com' })

    const response = await client
      .get('/api/contacts')
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const contacts = response.body().data
    assert.equal(contacts.length, 2)
    const names = contacts.map((c: { fullName: string }) => c.fullName)
    assert.includeMembers(names, ['Real Person', 'Another Human'])
    assert.notIncludeMembers(names, ['hiring manager', 'recruiter', 'unknown'])
  })

  test('placeholder contacts remain in DB (not deleted)', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)

    const { contactId } = await seedContact(userId, 'Hiring Manager')

    // API should not return it
    const response = await client
      .get('/api/contacts')
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.equal(response.body().data.length, 0)

    // But it should still exist in DB
    const dbContact = await db.from('contacts').where('id', contactId).first()
    assert.isNotNull(dbContact)
    assert.equal(dbContact.full_name, 'Hiring Manager')
  })

  test('contacts with similar but distinct names are NOT filtered', async ({
    client,
    assert,
  }) => {
    const { token, userId } = await createAuthenticatedUser(client)

    await seedContact(userId, 'Hiring Manager Jr.')
    await seedContact(userId, 'Senior Recruiter Smith')

    const response = await client
      .get('/api/contacts')
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const contacts = response.body().data
    assert.equal(contacts.length, 2)
  })
})
