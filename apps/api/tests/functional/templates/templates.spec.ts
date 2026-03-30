import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'
import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'

const AUTH_URL = '/api/auth'
const TEMPLATES_URL = '/api/templates'

const testUser = {
  email: 'template-test@example.com',
  password: TEST_USER_PASSWORD,
  fullName: 'Template Test User',
}

async function createAuthenticatedUser(client: ApiClient) {
  const response = await client.post(`${AUTH_URL}/register`).json(testUser)
  return {
    token: response.body().token as string,
    userId: response.body().user.id as string,
  }
}

async function cleanupAll() {
  await db.from('email_templates').delete()
  await db.from('candidate_profiles').delete()
  await db.from('auth_access_tokens').delete()
  await db.from('users').delete()
}

// ---------------------------------------------------------------------------
// GET /api/templates
// ---------------------------------------------------------------------------
test.group('GET /api/templates', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.get(TEMPLATES_URL)
    response.assertStatus(401)
  })

  test('should return 200 with empty list when no templates exist', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client.get(TEMPLATES_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.lengthOf(response.body().data, 0)
  })

  test('should return templates for current user', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    await client
      .post(TEMPLATES_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        name: 'My Template',
        subjectPattern: 'Hello {{name}}',
        bodyPattern: 'Dear {{name}}, ...',
      })

    const response = await client.get(TEMPLATES_URL).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.lengthOf(response.body().data, 1)
    assert.equal(response.body().data[0].name, 'My Template')
    assert.equal(response.body().data[0].subjectPattern, 'Hello {{name}}')
  })
})

// ---------------------------------------------------------------------------
// POST /api/templates
// ---------------------------------------------------------------------------
test.group('POST /api/templates', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.post(TEMPLATES_URL).json({
      name: 'Test',
      subjectPattern: 'Sub',
      bodyPattern: 'Body',
    })
    response.assertStatus(401)
  })

  test('should create a template', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .post(TEMPLATES_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        name: 'New Template',
        subjectPattern: 'Subject: {{company}}',
        bodyPattern: 'Dear {{contact}}, I am interested in {{company}}.',
      })

    response.assertStatus(201)
    const data = response.body().data
    assert.equal(data.name, 'New Template')
    assert.equal(data.subjectPattern, 'Subject: {{company}}')
    assert.equal(data.bodyPattern, 'Dear {{contact}}, I am interested in {{company}}.')
    assert.isFalse(data.isDefault)
    assert.exists(data.id)
  })

  test('should return 422 when required fields are missing', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .post(TEMPLATES_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'Incomplete' })

    response.assertStatus(422)
    assert.equal(response.body().error.code, 'MISSING_FIELDS')
  })

  test('should return 422 when name is missing', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .post(TEMPLATES_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({ subjectPattern: 'Sub', bodyPattern: 'Body' })

    response.assertStatus(422)
    assert.equal(response.body().error.code, 'MISSING_FIELDS')
  })

  test('should unset previous default when creating a new default template', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser(client)

    await client
      .post(TEMPLATES_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        name: 'First Default',
        subjectPattern: 'S1',
        bodyPattern: 'B1',
        isDefault: true,
      })

    await client
      .post(TEMPLATES_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        name: 'Second Default',
        subjectPattern: 'S2',
        bodyPattern: 'B2',
        isDefault: true,
      })

    const listResponse = await client
      .get(TEMPLATES_URL)
      .header('Authorization', `Bearer ${token}`)

    const templates = listResponse.body().data
    const defaults = templates.filter((t: { isDefault: boolean }) => t.isDefault)
    assert.lengthOf(defaults, 1)
    assert.equal(defaults[0].name, 'Second Default')
  })
})

// ---------------------------------------------------------------------------
// PUT /api/templates/:id
// ---------------------------------------------------------------------------
test.group('PUT /api/templates/:id', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.put(`${TEMPLATES_URL}/${randomUUID()}`).json({ name: 'Updated' })
    response.assertStatus(401)
  })

  test('should return 404 for non-existent template', async ({ client }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .put(`${TEMPLATES_URL}/${randomUUID()}`)
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'Updated' })

    response.assertStatus(404)
  })

  test('should update template fields', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const createResponse = await client
      .post(TEMPLATES_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        name: 'Original',
        subjectPattern: 'Old Subject',
        bodyPattern: 'Old Body',
      })

    const templateId = createResponse.body().data.id

    const response = await client
      .put(`${TEMPLATES_URL}/${templateId}`)
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'Updated Name', subjectPattern: 'New Subject' })

    response.assertStatus(200)
    assert.equal(response.body().data.name, 'Updated Name')
    assert.equal(response.body().data.subjectPattern, 'New Subject')
    // bodyPattern should remain unchanged
    assert.equal(response.body().data.bodyPattern, 'Old Body')
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/templates/:id
// ---------------------------------------------------------------------------
test.group('DELETE /api/templates/:id', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.delete(`${TEMPLATES_URL}/${randomUUID()}`)
    response.assertStatus(401)
  })

  test('should return 404 for non-existent template', async ({ client }) => {
    const { token } = await createAuthenticatedUser(client)

    const response = await client
      .delete(`${TEMPLATES_URL}/${randomUUID()}`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(404)
  })

  test('should delete an existing template', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)

    const createResponse = await client
      .post(TEMPLATES_URL)
      .header('Authorization', `Bearer ${token}`)
      .json({
        name: 'To Delete',
        subjectPattern: 'Sub',
        bodyPattern: 'Body',
      })

    const templateId = createResponse.body().data.id

    const response = await client
      .delete(`${TEMPLATES_URL}/${templateId}`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.isTrue(response.body().data.deleted)

    // Verify it is actually deleted
    const listResponse = await client
      .get(TEMPLATES_URL)
      .header('Authorization', `Bearer ${token}`)

    assert.lengthOf(listResponse.body().data, 0)
  })
})
