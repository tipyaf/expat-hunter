import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'
import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'

const AUTH_URL = '/api/auth'
const PROFILE_URL = '/api/profile'

const testUser = {
  email: 'profile-test@example.com',
  password: TEST_USER_PASSWORD,
  fullName: 'Profile Test User',
}

async function createAuthenticatedUser(client: ApiClient) {
  const response = await client.post(`${AUTH_URL}/register`).json(testUser)
  return response.body().token as string
}

test.group('GET /api/profile', (group) => {
  group.each.setup(async () => {
    await db.from('follow_up_sequences').delete()
    await db.from('candidate_profiles').delete()
    await db.from('auth_access_tokens').delete()
    await db.from('users').delete()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.get(PROFILE_URL)
    response.assertStatus(401)
  })

  test('should return null data when no profile exists', async ({ client, assert }) => {
    const token = await createAuthenticatedUser(client)

    const response = await client.get(PROFILE_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.isNull(response.body().data)
  })

  test('should return profile data after creation', async ({ client, assert }) => {
    const token = await createAuthenticatedUser(client)

    // Create profile first
    await client
      .put(PROFILE_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        skills: ['TypeScript', 'Node.js'],
        experienceYears: 5,
        targetCountries: ['NZ'],
      })

    const response = await client.get(PROFILE_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.isNotNull(response.body().data)
    assert.deepEqual(response.body().data.skills, ['TypeScript', 'Node.js'])
    assert.equal(response.body().data.experienceYears, 5)
    assert.deepEqual(response.body().data.targetCountries, ['NZ'])
    assert.isFalse(response.body().data.onboardingCompleted)
  })
})

test.group('PUT /api/profile', (group) => {
  group.each.setup(async () => {
    await db.from('follow_up_sequences').delete()
    await db.from('candidate_profiles').delete()
    await db.from('auth_access_tokens').delete()
    await db.from('users').delete()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.put(PROFILE_URL).json({ skills: ['TypeScript'] })
    response.assertStatus(401)
  })

  test('should create a new profile with provided data', async ({ client, assert }) => {
    const token = await createAuthenticatedUser(client)

    const response = await client
      .put(PROFILE_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        skills: ['Python', 'Django'],
        experienceYears: 3,
        targetCountries: ['AU', 'NZ'],
        targetSectors: ['Tech', 'Finance'],
        targetRoles: ['Backend Developer'],
      })

    response.assertStatus(200)
    const data = response.body().data
    assert.deepEqual(data.skills, ['Python', 'Django'])
    assert.equal(data.experienceYears, 3)
    assert.deepEqual(data.targetCountries, ['AU', 'NZ'])
    assert.deepEqual(data.targetSectors, ['Tech', 'Finance'])
    assert.deepEqual(data.targetRoles, ['Backend Developer'])
  })

  test('should update existing profile (not create a second one)', async ({ client, assert }) => {
    const token = await createAuthenticatedUser(client)

    // Create
    await client
      .put(PROFILE_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        skills: ['TypeScript'],
        experienceYears: 2,
      })

    // Update
    const response = await client
      .put(PROFILE_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        skills: ['TypeScript', 'React'],
        experienceYears: 5,
        targetCountries: ['NZ'],
      })

    response.assertStatus(200)
    const data = response.body().data
    assert.deepEqual(data.skills, ['TypeScript', 'React'])
    assert.equal(data.experienceYears, 5)
    assert.deepEqual(data.targetCountries, ['NZ'])
  })

  test('should accept partial update (only skills)', async ({ client, assert }) => {
    const token = await createAuthenticatedUser(client)

    // Create full profile
    await client
      .put(PROFILE_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        skills: ['TypeScript'],
        experienceYears: 5,
        targetCountries: ['NZ'],
      })

    // Partial update
    const response = await client
      .put(PROFILE_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        skills: ['TypeScript', 'Rust'],
      })

    response.assertStatus(200)
    assert.deepEqual(response.body().data.skills, ['TypeScript', 'Rust'])
    assert.equal(response.body().data.experienceYears, 5)
    assert.deepEqual(response.body().data.targetCountries, ['NZ'])
  })

  test('should return 422 for invalid experienceYears (negative)', async ({ client }) => {
    const token = await createAuthenticatedUser(client)

    const response = await client.put(PROFILE_URL).header('Authorization', `Bearer ${token}`).json({
      experienceYears: -1,
    })

    response.assertStatus(422)
  })

  test('should return 422 for invalid experienceYears (too high)', async ({ client }) => {
    const token = await createAuthenticatedUser(client)

    const response = await client.put(PROFILE_URL).header('Authorization', `Bearer ${token}`).json({
      experienceYears: 51,
    })

    response.assertStatus(422)
  })

  test('should return 422 for invalid sendingSchedule (bad hour)', async ({ client }) => {
    const token = await createAuthenticatedUser(client)

    const response = await client
      .put(PROFILE_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        sendingSchedule: {
          allowedDays: ['mon', 'tue'],
          startHour: 25,
          endHour: 18,
          timezone: 'Pacific/Auckland',
        },
      })

    response.assertStatus(422)
  })

  test('should return 422 for invalid sendingSchedule (bad day)', async ({ client }) => {
    const token = await createAuthenticatedUser(client)

    const response = await client
      .put(PROFILE_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        sendingSchedule: {
          allowedDays: ['monday'],
          startHour: 9,
          endHour: 18,
          timezone: 'Pacific/Auckland',
        },
      })

    response.assertStatus(422)
  })

  test('should return 422 for invalid followUps (bad unit)', async ({ client }) => {
    const token = await createAuthenticatedUser(client)

    const response = await client
      .put(PROFILE_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        followUps: [{ delay: 3, unit: 'hours' }],
      })

    response.assertStatus(422)
  })

  test('should return 422 for invalid followUps (negative delay)', async ({ client }) => {
    const token = await createAuthenticatedUser(client)

    const response = await client
      .put(PROFILE_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        followUps: [{ delay: -1, unit: 'days' }],
      })

    response.assertStatus(422)
  })

  test('should return completionPercentage = 0 for empty profile', async ({ client, assert }) => {
    const token = await createAuthenticatedUser(client)

    await client.put(PROFILE_URL).header('Authorization', `Bearer ${token}`).json({})

    const response = await client.get(PROFILE_URL).header('Authorization', `Bearer ${token}`)

    assert.equal(response.body().data.completionPercentage, 20) // fullName counts
  })

  test('should return completionPercentage = 100 for complete profile', async ({
    client,
    assert,
  }) => {
    const token = await createAuthenticatedUser(client)

    await client
      .put(PROFILE_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        skills: ['TypeScript'],
        cvText: 'Experienced developer',
        targetCountries: ['NZ'],
        targetRoles: ['Backend Developer'],
      })

    const response = await client.get(PROFILE_URL).header('Authorization', `Bearer ${token}`)

    assert.equal(response.body().data.completionPercentage, 100)
  })
})

test.group('POST /api/profile/complete-onboarding', (group) => {
  group.each.setup(async () => {
    await db.from('follow_up_sequences').delete()
    await db.from('candidate_profiles').delete()
    await db.from('auth_access_tokens').delete()
    await db.from('users').delete()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.post(`${PROFILE_URL}/complete-onboarding`)
    response.assertStatus(401)
  })

  test('should complete onboarding when profile has skills and target countries', async ({
    client,
    assert,
  }) => {
    const token = await createAuthenticatedUser(client)

    // Set up profile with required data
    await client
      .put(PROFILE_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        skills: ['TypeScript', 'Node.js'],
        experienceYears: 5,
        targetCountries: ['NZ'],
        targetSectors: ['Tech'],
        targetRoles: ['Backend Developer'],
      })

    const response = await client
      .post(`${PROFILE_URL}/complete-onboarding`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.isTrue(response.body().data.onboardingCompleted)
  })

  test('should create default follow-up sequence on onboarding completion', async ({
    client,
    assert,
  }) => {
    const token = await createAuthenticatedUser(client)

    await client
      .put(PROFILE_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        skills: ['TypeScript'],
        targetCountries: ['NZ'],
      })

    await client
      .post(`${PROFILE_URL}/complete-onboarding`)
      .header('Authorization', `Bearer ${token}`)

    // Verify follow-up sequence was created
    const meResponse = await client.get(`${AUTH_URL}/me`).header('Authorization', `Bearer ${token}`)
    const userId = meResponse.body().id

    const sequences = await db.from('follow_up_sequences').where('user_id', userId)
    assert.lengthOf(sequences, 1)
    assert.equal(sequences[0].delay_days_1, 3)
    assert.equal(sequences[0].delay_days_2, 7)
    assert.equal(sequences[0].delay_days_3, 14)
  })

  test('should return 422 when profile has no skills and no CV', async ({ client }) => {
    const token = await createAuthenticatedUser(client)

    // Create empty profile
    await client
      .put(PROFILE_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        targetCountries: ['NZ'],
      })

    const response = await client
      .post(`${PROFILE_URL}/complete-onboarding`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(422)
  })

  test('should return 422 when profile has no target countries', async ({ client }) => {
    const token = await createAuthenticatedUser(client)

    await client
      .put(PROFILE_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        skills: ['TypeScript'],
      })

    const response = await client
      .post(`${PROFILE_URL}/complete-onboarding`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(422)
  })
})

test.group('POST /api/profile/cv', (group) => {
  group.each.setup(async () => {
    await db.from('follow_up_sequences').delete()
    await db.from('candidate_profiles').delete()
    await db.from('auth_access_tokens').delete()
    await db.from('users').delete()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.post(`${PROFILE_URL}/cv`)
    response.assertStatus(401)
  })

  test('should return 400 when no file is uploaded', async ({ client }) => {
    const token = await createAuthenticatedUser(client)

    const response = await client
      .post(`${PROFILE_URL}/cv`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(400)
  })

  test('should accept a .txt CV file and save the text', async ({ client, assert }) => {
    const token = await createAuthenticatedUser(client)

    const cvContent = 'John Doe\nSenior Backend Developer\n5 years TypeScript, Node.js, PostgreSQL'

    const response = await client
      .post(`${PROFILE_URL}/cv`)
      .header('Authorization', `Bearer ${token}`)
      .file('cv', Buffer.from(cvContent), { filename: 'cv.txt', contentType: 'text/plain' })

    response.assertStatus(200)
    assert.isNotNull(response.body().data)
    assert.include(response.body().data.cvText, 'John Doe')
  })

  test('should return 422 for unsupported file extension', async ({ client }) => {
    const token = await createAuthenticatedUser(client)

    const response = await client
      .post(`${PROFILE_URL}/cv`)
      .header('Authorization', `Bearer ${token}`)
      .file('cv', Buffer.from('not a cv'), { filename: 'cv.exe', contentType: 'application/octet-stream' })

    response.assertStatus(422)
  })
})
