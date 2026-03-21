import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'

const AUTH_URL = '/api/auth'

const testUser = {
  email: 'confidence-test@example.com',
  password: 'password123',
  fullName: 'Confidence Test User',
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

async function seedContact(userId: string, overrides: Record<string, unknown> = {}) {
  const companyId = randomUUID()
  const now = new Date().toISOString()
  await db.table('companies').insert({
    id: companyId,
    name: `Company ${companyId.slice(0, 8)}`,
    country: 'NZ',
    source: 'seek',
    website: overrides.companyWebsite ?? null,
    sector: overrides.companySector ?? null,
    city: overrides.companyCity ?? null,
    created_at: now,
    updated_at: now,
  })

  const contactId = randomUUID()
  await db.table('contacts').insert({
    id: contactId,
    user_id: userId,
    company_id: companyId,
    full_name: 'John Doe',
    role: overrides.role ?? 'Developer',
    email: overrides.email ?? null,
    linkedin_url: overrides.linkedinUrl ?? null,
    source: 'seek',
    status: 'identified',
    relevance_score: overrides.relevanceScore ?? null,
    relevance_label: overrides.relevanceLabel ?? null,
    user_override: false,
    created_at: now,
    updated_at: now,
  })

  return { contactId, companyId }
}

test.group('Contacts API - Confidence Score', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('GET /api/contacts returns confidenceScore and confidenceFactors', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    await seedContact(userId, { email: 'john@acme.com', role: 'CTO' })

    const response = await client
      .get('/api/contacts')
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)

    const contact = response.body().data[0]
    assert.isNotNull(contact.confidenceScore)
    assert.isNumber(contact.confidenceScore)
    assert.isAtLeast(contact.confidenceScore, 0)
    assert.isAtMost(contact.confidenceScore, 100)
    assert.isArray(contact.confidenceFactors)
    assert.isAbove(contact.confidenceFactors.length, 0)
  })

  test('contact with email scores higher than without', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    await seedContact(userId, { email: 'cto@acme.com', role: 'CTO' })
    await seedContact(userId, { email: null, role: '' })

    const response = await client
      .get('/api/contacts')
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)

    const contacts = response.body().data
    const withEmail = contacts.find((c: any) => c.email)
    const withoutEmail = contacts.find((c: any) => !c.email)
    assert.isAbove(withEmail.confidenceScore, withoutEmail.confidenceScore)
  })

  test('GET /api/contacts/:id returns confidenceScore', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    const { contactId } = await seedContact(userId, {
      email: 'dev@acme.com',
      role: 'Senior Developer',
      companyWebsite: 'https://acme.com',
      companySector: 'Technology',
      companyCity: 'Auckland',
    })

    const response = await client
      .get(`/api/contacts/${contactId}`)
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)

    const data = response.body().data
    assert.isNotNull(data.confidenceScore)
    assert.isAbove(data.confidenceScore, 50)
    assert.isArray(data.confidenceFactors)

    // Should have positive factors for email, role, company data
    const positives = data.confidenceFactors.filter((f: any) => f.impact === 'positive')
    assert.isAbove(positives.length, 2)
  })

  test('confidence factors have correct structure', async ({ client, assert }) => {
    const { token, userId } = await createAuthenticatedUser(client)
    await seedContact(userId, { email: 'a@b.com' })

    const response = await client
      .get('/api/contacts')
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)

    const factor = response.body().data[0].confidenceFactors[0]
    assert.property(factor, 'label')
    assert.property(factor, 'impact')
    assert.property(factor, 'weight')
    assert.include(['positive', 'negative', 'neutral'], factor.impact)
    assert.isNumber(factor.weight)
  })
})
