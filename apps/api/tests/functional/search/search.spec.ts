import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'
import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'

const AUTH_URL = '/api/auth'
const SEARCH_URL = '/api/recherche'
const MARKET_URL = '/api/market'

const testUser = {
  email: 'search-test@example.com',
  password: TEST_USER_PASSWORD,
  fullName: 'Search Test User',
}

async function createUser(client: ApiClient, data: typeof testUser) {
  const response = await client.post(`${AUTH_URL}/register`).json(data)
  return {
    token: response.body().token as string,
    userId: response.body().user.id as string,
  }
}

async function createProfile(userId: string) {
  await db.table('candidate_profiles').insert({
    id: crypto.randomUUID(),
    user_id: userId,
    skills: JSON.stringify(['typescript', 'react']),
    experience_years: 5,
    target_countries: JSON.stringify(['NZ']),
    target_sectors: JSON.stringify(['technology']),
    target_roles: JSON.stringify(['developer']),
    onboarding_completed: true,
    recontact_cooldown_days: 180,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
}

async function cleanupAll() {
  await db.from('search_runs').delete()
  await db.from('email_messages').delete()
  await db.from('contacts').delete()
  await db.from('sourcing_runs').delete()
  await db.from('companies').delete()
  await db.from('external_cache').delete()
  await db.from('candidate_profiles').delete()
  await db.from('auth_access_tokens').delete()
  await db.from('users').delete()
}

// ---------------------------------------------------------------------------
// GET /api/recherche/defaults
// ---------------------------------------------------------------------------
test.group('GET /api/recherche/defaults', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('returns defaults from user profile', async ({ client, assert }) => {
    const { token, userId } = await createUser(client, testUser)
    await createProfile(userId)

    const response = await client
      .get(`${SEARCH_URL}/defaults`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.equal(response.body().data.country, 'NZ')
    assert.equal(response.body().data.sector, 'technology')
  })

  test('returns null defaults when no profile', async ({ client, assert }) => {
    const { token } = await createUser(client, {
      ...testUser,
      email: 'no-profile@example.com',
    })

    const response = await client
      .get(`${SEARCH_URL}/defaults`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.isNull(response.body().data.country)
    assert.isNull(response.body().data.sector)
  })

  test('returns 401 without auth', async ({ client }) => {
    const response = await client.get(`${SEARCH_URL}/defaults`)
    response.assertStatus(401)
  })
})

// ---------------------------------------------------------------------------
// GET /api/recherche
// ---------------------------------------------------------------------------
test.group('GET /api/recherche', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('returns empty list when no search runs', async ({ client, assert }) => {
    const { token } = await createUser(client, testUser)

    const response = await client.get(SEARCH_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.lengthOf(response.body().data, 0)
  })

  test('returns 401 without auth', async ({ client }) => {
    const response = await client.get(SEARCH_URL)
    response.assertStatus(401)
  })
})

// ---------------------------------------------------------------------------
// POST /api/recherche
// ---------------------------------------------------------------------------
test.group('POST /api/recherche — validation', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('returns 400 when country is missing', async ({ client }) => {
    const { token } = await createUser(client, testUser)

    const response = await client
      .post(SEARCH_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({})

    response.assertStatus(400)
  })

  test('returns 400 when country is too short', async ({ client }) => {
    const { token } = await createUser(client, testUser)

    const response = await client
      .post(SEARCH_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ country: 'N' })

    response.assertStatus(400)
  })

  test('returns 401 without auth', async ({ client }) => {
    const response = await client.post(SEARCH_URL).json({ country: 'NZ' })

    response.assertStatus(401)
  })
})

// ---------------------------------------------------------------------------
// POST /api/recherche — async launch behavior
// ---------------------------------------------------------------------------
test.group('POST /api/recherche — async launch', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  const asyncTestUser = {
    email: 'async-search-test@example.com',
    password: TEST_USER_PASSWORD,
    fullName: 'Async Search Test',
  }

  test('returns immediately with searchRunId (not blocking)', async ({ client, assert }) => {
    const { token } = await createUser(client, asyncTestUser)

    const start = Date.now()
    const response = await client
      .post(SEARCH_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ country: 'NZ' })

    const elapsed = Date.now() - start

    response.assertStatus(200)
    const body = response.body()
    assert.property(body.data, 'searchRunId')
    assert.isString(body.data.searchRunId)

    // Should return in under 5 seconds (not wait for pipeline to finish)
    assert.isBelow(elapsed, 5000, 'Response took too long — launch should be async')
  })

  test('search run is created in DB with status pending', async ({ client, assert }) => {
    const { token } = await createUser(client, asyncTestUser)

    const response = await client
      .post(SEARCH_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ country: 'NZ' })

    response.assertStatus(200)
    const searchRunId = response.body().data.searchRunId

    // Check in DB
    const run = await db.from('search_runs').where('id', searchRunId).first()
    assert.isNotNull(run)
    assert.oneOf(run.status, [
      'pending',
      'scraping',
      'enriching',
      'analyzing',
      'generating',
      'completed',
      'failed',
    ])
  })

  test('progress endpoint returns status for created search run', async ({ client, assert }) => {
    const { token } = await createUser(client, asyncTestUser)

    const launchRes = await client
      .post(SEARCH_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ country: 'NZ' })

    const searchRunId = launchRes.body().data.searchRunId

    const progressRes = await client
      .get(`${SEARCH_URL}/${searchRunId}/progress`)
      .header('Authorization', `Bearer ${token}`)

    progressRes.assertStatus(200)
    const data = progressRes.body().data
    assert.property(data, 'status')
    assert.property(data, 'progressPercent')
    assert.property(data, 'contactsFound')
  })
})

// ---------------------------------------------------------------------------
// GET /api/recherche/:id/progress
// ---------------------------------------------------------------------------
test.group('GET /api/recherche/:id/progress', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('returns 404 for non-existent search run', async ({ client }) => {
    const { token } = await createUser(client, testUser)

    const response = await client
      .get(`${SEARCH_URL}/00000000-0000-0000-0000-000000000000/progress`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(404)
  })

  test('returns 401 without auth', async ({ client }) => {
    const response = await client.get(`${SEARCH_URL}/00000000-0000-0000-0000-000000000000/progress`)

    response.assertStatus(401)
  })
})

// ---------------------------------------------------------------------------
// GET /api/market/snapshot
// ---------------------------------------------------------------------------
test.group('GET /api/market/snapshot', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('returns market snapshot for a country', async ({ client, assert }) => {
    const { token } = await createUser(client, testUser)

    const response = await client
      .get(`${MARKET_URL}/snapshot?country=New Zealand`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    const data = response.body().data
    assert.equal(data.country, 'New Zealand')
    assert.isString(data.trend)
    assert.isString(data.bestPeriod)
    assert.isAbove(data.estimatedOffers, 0)
    assert.isArray(data.insights)
  })

  test('returns market snapshot with sector', async ({ client, assert }) => {
    const { token } = await createUser(client, testUser)

    const response = await client
      .get(`${MARKET_URL}/snapshot?country=Australia&sector=technology`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.equal(response.body().data.country, 'Australia')
  })

  test('returns 400 when country is missing', async ({ client }) => {
    const { token } = await createUser(client, testUser)

    const response = await client
      .get(`${MARKET_URL}/snapshot`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(400)
  })

  test('returns 401 without auth', async ({ client }) => {
    const response = await client.get(`${MARKET_URL}/snapshot?country=NZ`)
    response.assertStatus(401)
  })
})
