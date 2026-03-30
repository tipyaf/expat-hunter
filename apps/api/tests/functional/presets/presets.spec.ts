import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'
import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'

const AUTH_URL = '/api/auth'
const PRESETS_URL = '/api/presets'

const testUser = {
  email: 'preset-test@example.com',
  password: TEST_USER_PASSWORD,
  fullName: 'Preset Test User',
}

async function createAuthenticatedUser(client: ApiClient) {
  const response = await client.post(`${AUTH_URL}/register`).json(testUser)
  return {
    token: response.body().token as string,
    userId: response.body().user.id as string,
  }
}

async function cleanupAll() {
  await db.from('generation_presets').delete()
  await db.from('candidate_profiles').delete()
  await db.from('auth_access_tokens').delete()
  await db.from('users').delete()
}

// ---------------------------------------------------------------------------
// GET /api/presets
// ---------------------------------------------------------------------------
test.group('GET /api/presets', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.get(PRESETS_URL)
    response.assertStatus(401)
  })

  test('should return 200 with empty list when no presets exist', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client.get(PRESETS_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.lengthOf(response.body().data, 0)
  })

  test('should return presets for current user', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    // Create a preset first
    await client
      .post(PRESETS_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'My Preset', length: 'short', framework: 'aida' })

    const response = await client.get(PRESETS_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.lengthOf(response.body().data, 1)
    assert.equal(response.body().data[0].name, 'My Preset')
    assert.equal(response.body().data[0].length, 'short')
    assert.equal(response.body().data[0].framework, 'aida')
  })
})

// ---------------------------------------------------------------------------
// POST /api/presets
// ---------------------------------------------------------------------------
test.group('POST /api/presets', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.post(PRESETS_URL).json({ name: 'Test' })
    response.assertStatus(401)
  })

  test('should create a preset with defaults', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .post(PRESETS_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'Default Preset' })

    response.assertStatus(201)
    const data = response.body().data
    assert.equal(data.name, 'Default Preset')
    assert.equal(data.length, 'medium')
    assert.equal(data.framework, 'direct')
    assert.equal(data.tone, 'professional')
    assert.equal(data.language, 'fr')
    assert.isFalse(data.isDefault)
    assert.exists(data.id)
  })

  test('should return 422 when name is missing', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .post(PRESETS_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ length: 'short' })

    response.assertStatus(422)
    assert.equal(response.body().error.code, 'MISSING_FIELDS')
  })

  test('should return 422 for invalid length', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .post(PRESETS_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'Bad Preset', length: 'invalid' })

    response.assertStatus(422)
    assert.equal(response.body().error.code, 'INVALID_LENGTH')
  })

  test('should return 422 for invalid framework', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .post(PRESETS_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'Bad Preset', framework: 'invalid' })

    response.assertStatus(422)
    assert.equal(response.body().error.code, 'INVALID_FRAMEWORK')
  })

  test('should return 422 when customInstructions exceeds max length', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .post(PRESETS_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'Long Instructions', customInstructions: 'a'.repeat(501) })

    response.assertStatus(422)
    assert.equal(response.body().error.code, 'INSTRUCTIONS_TOO_LONG')
  })

  test('should unset previous default when creating a new default preset', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser(client)

    // Create first default preset
    await client
      .post(PRESETS_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'First Default', isDefault: true })

    // Create second default preset
    await client
      .post(PRESETS_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'Second Default', isDefault: true })

    const listResponse = await client
      .get(PRESETS_URL)
      .header('Authorization', `Bearer ${token}`)

    const presets = listResponse.body().data
    const defaults = presets.filter((p: { isDefault: boolean }) => p.isDefault)
    assert.lengthOf(defaults, 1)
    assert.equal(defaults[0].name, 'Second Default')
  })
})

// ---------------------------------------------------------------------------
// PUT /api/presets/:id
// ---------------------------------------------------------------------------
test.group('PUT /api/presets/:id', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.put(`${PRESETS_URL}/${randomUUID()}`).json({ name: 'Updated' })
    response.assertStatus(401)
  })

  test('should return 404 for non-existent preset', async ({ client }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .put(`${PRESETS_URL}/${randomUUID()}`)
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'Updated' })

    response.assertStatus(404)
  })

  test('should update preset fields', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const createResponse = await client
      .post(PRESETS_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'Original' })

    const presetId = createResponse.body().data.id

    const response = await client
      .put(`${PRESETS_URL}/${presetId}`)
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'Updated Name', length: 'long', framework: 'pas' })

    response.assertStatus(200)
    assert.equal(response.body().data.name, 'Updated Name')
    assert.equal(response.body().data.length, 'long')
    assert.equal(response.body().data.framework, 'pas')
  })

  test('should return 422 for invalid length on update', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const createResponse = await client
      .post(PRESETS_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'Preset' })

    const presetId = createResponse.body().data.id

    const response = await client
      .put(`${PRESETS_URL}/${presetId}`)
      .header('Authorization', `Bearer ${token}`)
      .json({ length: 'invalid' })

    response.assertStatus(422)
    assert.equal(response.body().error.code, 'INVALID_LENGTH')
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/presets/:id
// ---------------------------------------------------------------------------
test.group('DELETE /api/presets/:id', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.delete(`${PRESETS_URL}/${randomUUID()}`)
    response.assertStatus(401)
  })

  test('should return 404 for non-existent preset', async ({ client }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .delete(`${PRESETS_URL}/${randomUUID()}`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(404)
  })

  test('should delete an existing preset', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const createResponse = await client
      .post(PRESETS_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'To Delete' })

    const presetId = createResponse.body().data.id

    const response = await client
      .delete(`${PRESETS_URL}/${presetId}`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.isTrue(response.body().data.deleted)

    // Verify it is actually deleted
    const listResponse = await client
      .get(PRESETS_URL)
      .header('Authorization', `Bearer ${token}`)

    assert.lengthOf(listResponse.body().data, 0)
  })
})
