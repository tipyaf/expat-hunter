import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'
/**
 * E2E test: Search quality validation.
 *
 * Single test that runs the full pipeline ONCE and validates:
 * 1. Named contacts exist (not just "Hiring Manager")
 * 2. Contacts have emails
 * 3. Analysis ran (contactsRelevant defined)
 */
import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'

const AUTH_URL = '/api/auth'
const SEARCH_URL = '/api/recherche'

const testUser = {
  email: 'quality-test@example.com',
  password: TEST_USER_PASSWORD,
  fullName: 'Quality Test User',
}

async function createUserWithProfile(client: ApiClient) {
  const response = await client.post(`${AUTH_URL}/register`).json(testUser)
  const token = response.body().token as string
  const userId = response.body().user.id as string

  await db.table('candidate_profiles').insert({
    id: crypto.randomUUID(),
    user_id: userId,
    skills: JSON.stringify(['typescript', 'react', 'node.js']),
    experience_years: 8,
    target_countries: JSON.stringify(['NZ']),
    target_sectors: JSON.stringify(['technology']),
    target_roles: JSON.stringify(['Engineering Manager', 'CTO']),
    onboarding_completed: true,
    recontact_cooldown_days: 180,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  return { token, userId }
}

async function cleanupAll() {
  await db.from('email_messages').delete()
  await db.from('email_replies').delete()
  await db.from('search_runs').delete()
  await db.from('contacts').delete()
  await db.from('sourcing_runs').delete()
  await db.from('companies').delete()
  await db.from('external_cache').delete()
  await db.from('candidate_profiles').delete()
  await db.from('auth_access_tokens').delete()
  await db.from('users').where('email', testUser.email).delete()
}

test.group('Search quality — full pipeline', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  group.each.teardown(async () => {
    await cleanupAll()
  })

  test('NZ search produces named contacts with emails', async ({ client, assert }) => {
    const { token } = await createUserWithProfile(client)

    // Launch full search
    const response = await client
      .post(SEARCH_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ country: 'NZ', sector: 'technology' })
      .timeout(300_000)

    response.assertStatus(200)
    const data = response.body().data
    assert.isAbove(data.contactsFound, 0, 'Should find at least 1 contact')

    // Check quality in DB
    const contacts = await db.from('contacts').select('full_name', 'email', 'source', 'email_source', 'relevance_score')
    const namedContacts = contacts.filter(
      (c: { full_name: string }) =>
        c.full_name !== 'Hiring Manager' &&
        c.full_name !== 'Contact' &&
        c.full_name !== 'Unknown' &&
        c.full_name.trim().length > 2
    )
    const withEmail = contacts.filter((c: { email: string | null }) => c.email !== null)
    const hunterContacts = contacts.filter((c: { email_source: string | null }) => c.email_source === 'hunter')

    // Quality checks
    assert.isAbove(namedContacts.length, 0, `Need named contacts. Got: ${contacts.slice(0, 5).map((c: { full_name: string }) => c.full_name).join(', ')}`)
    assert.isAbove(withEmail.length, 0, `Need contacts with emails. ${contacts.length} total, ${withEmail.length} with email`)
    assert.isAbove(hunterContacts.length, 0, `Hunter should have found contacts. Sources: ${[...new Set(contacts.map((c: { source: string }) => c.source))].join(', ')}`)

    // API result checks
    assert.isDefined(data.contactsRelevant, 'contactsRelevant should be defined')
    assert.isDefined(data.emailsGenerated, 'emailsGenerated should be defined')
  }).timeout(300_000)
})
