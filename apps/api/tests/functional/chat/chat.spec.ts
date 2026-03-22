import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'

const AUTH_URL = '/api/auth'
const CHAT_URL = '/api/assistant'

const testUser = {
  email: 'chat-test@example.com',
  password: 'password123',
  fullName: 'Chat Test User',
}

async function createAuthenticatedUser(client: ApiClient) {
  const response = await client.post(`${AUTH_URL}/register`).json(testUser)
  return {
    token: response.body().token as string,
    userId: response.body().user.id as string,
  }
}

async function cleanupAll() {
  await db.from('auth_access_tokens').delete()
  await db.from('users').delete()
}

// ---------------------------------------------------------------------------
// POST /api/assistant/chat
// ---------------------------------------------------------------------------
test.group('POST /api/assistant/chat', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.post(`${CHAT_URL}/chat`).json({
      message: 'Comment lancer une recherche ?',
      sessionId: 'sess_test_001',
    })
    response.assertStatus(401)
  })

  test('should return 422 with missing message', async ({ client }) => {
    const { token } = await createAuthenticatedUser(client)
    const response = await client
      .post(`${CHAT_URL}/chat`)
      .header('Authorization', `Bearer ${token}`)
      .json({ sessionId: 'sess_test_001' })
    response.assertStatus(422)
  })

  test('should return 422 with missing sessionId', async ({ client }) => {
    const { token } = await createAuthenticatedUser(client)
    const response = await client
      .post(`${CHAT_URL}/chat`)
      .header('Authorization', `Bearer ${token}`)
      .json({ message: 'Comment lancer une recherche ?' })
    response.assertStatus(422)
  })

  test('should return 200 with support mode for app question', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)
    const response = await client
      .post(`${CHAT_URL}/chat`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        message: 'Comment lancer une recherche ?',
        sessionId: 'sess_test_support_001',
        page: 'recherche',
      })
    response.assertStatus(200)
    const data = response.body().data
    assert.exists(data.message)
    assert.exists(data.mode)
    assert.isString(data.message)
    assert.isString(data.mode)
  })

  test('should return expert mode for visa question', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)
    const response = await client
      .post(`${CHAT_URL}/chat`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        message: 'Est-ce que cette entreprise sponsorise les visas en NZ ?',
        sessionId: 'sess_test_expert_001',
        page: 'contacts',
        companyName: 'Acme Corp',
        country: 'NZ',
      })
    response.assertStatus(200)
    const data = response.body().data
    assert.exists(data.message)
    assert.equal(data.mode, 'expert')
  })

  test('should maintain session history with same sessionId', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)
    const sessionId = 'sess_history_test_001'

    // First message
    const firstResponse = await client
      .post(`${CHAT_URL}/chat`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        message: 'Comment lancer une recherche ?',
        sessionId,
        page: 'recherche',
      })
    firstResponse.assertStatus(200)

    // Second message - session should have history
    const secondResponse = await client
      .post(`${CHAT_URL}/chat`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        message: 'Et comment voir les résultats ?',
        sessionId,
        page: 'recherche',
      })
    secondResponse.assertStatus(200)
    const data = secondResponse.body().data
    assert.exists(data.message)
    assert.isString(data.message)
  })

  test('should return 422 if message exceeds 2000 characters', async ({ client }) => {
    const { token } = await createAuthenticatedUser(client)
    const response = await client
      .post(`${CHAT_URL}/chat`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        message: 'a'.repeat(2001),
        sessionId: 'sess_test_long_001',
      })
    response.assertStatus(422)
  })
})

// ---------------------------------------------------------------------------
// GET /api/assistant/chat/:sessionId
// ---------------------------------------------------------------------------
test.group('GET /api/assistant/chat/:sessionId', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('should return 401 without auth token', async ({ client }) => {
    const response = await client.get(`${CHAT_URL}/chat/sess_test_001`)
    response.assertStatus(401)
  })

  test('should return empty history for unknown session', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)
    const response = await client
      .get(`${CHAT_URL}/chat/sess_nonexistent_999`)
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)
    assert.isArray(response.body().data)
    assert.lengthOf(response.body().data, 0)
  })

  test('should return history array after sending messages', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)
    const sessionId = 'sess_get_history_001'

    // Send a message first
    await client
      .post(`${CHAT_URL}/chat`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        message: 'Comment envoyer des emails ?',
        sessionId,
        page: 'emails',
      })

    // Get history
    const response = await client
      .get(`${CHAT_URL}/chat/${sessionId}`)
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)
    const history = response.body().data
    assert.isArray(history)
    assert.isAtLeast(history.length, 2) // user message + assistant response
    assert.equal(history[0].role, 'user')
    assert.equal(history[1].role, 'assistant')
  })
})
