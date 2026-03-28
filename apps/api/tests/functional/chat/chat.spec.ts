import { TEST_USER_PASSWORD, ensureTestUserPremium } from '#tests/helpers/credentials'
import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'

const AUTH_URL = '/api/auth'
const CHAT_URL = '/api/assistant'

const testUser = {
  email: 'chat-test@example.com',
  password: TEST_USER_PASSWORD,
  fullName: 'Chat Test User',
}

async function createAuthenticatedUser(client: ApiClient) {
  const response = await client.post(`${AUTH_URL}/register`).json(testUser)
  const userId = response.body().user.id as string
  await ensureTestUserPremium(userId)
  return {
    token: response.body().token as string,
    userId,
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

  // --- FAQ-specific tests ---

  test('should return FAQ answer for "comment lancer une recherche" without calling AI', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser(client)
    const response = await client
      .post(`${CHAT_URL}/chat`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        message: 'Comment lancer une recherche ?',
        sessionId: 'sess_faq_search_001',
        page: 'recherche',
      })
    response.assertStatus(200)
    const data = response.body().data
    assert.equal(data.mode, 'support')
    // FAQ answer must mention "Recherche" (part of the FAQ response)
    assert.include(data.message, 'Recherche')
    assert.include(data.message, 'Lancer')
  })

  test('should return FAQ answer for "comment générer des emails"', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser(client)
    const response = await client
      .post(`${CHAT_URL}/chat`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        message: 'Comment générer des emails ?',
        sessionId: 'sess_faq_email_001',
        page: 'emails',
      })
    response.assertStatus(200)
    const data = response.body().data
    assert.equal(data.mode, 'support')
    assert.include(data.message, 'Emails')
  })

  test('should return FAQ answer for "comment envoyer des emails"', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser(client)
    const response = await client
      .post(`${CHAT_URL}/chat`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        message: 'Comment envoyer des emails ?',
        sessionId: 'sess_faq_send_001',
        page: 'emails',
      })
    response.assertStatus(200)
    const data = response.body().data
    assert.equal(data.mode, 'support')
    assert.include(data.message, 'Emails')
  })

  test('should return FAQ answer for "what is a preset"', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)
    const response = await client
      .post(`${CHAT_URL}/chat`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        message: 'What is a preset exactly?',
        sessionId: 'sess_faq_preset_001',
        page: 'settings',
      })
    response.assertStatus(200)
    const data = response.body().data
    assert.include(data.message, 'Preset')
  })

  // --- Response structure tests ---

  test('should return correct response structure with message, mode', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser(client)
    const response = await client
      .post(`${CHAT_URL}/chat`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        message: 'Comment lancer une recherche ?',
        sessionId: 'sess_struct_001',
        page: 'dashboard',
      })
    response.assertStatus(200)
    const body = response.body()
    assert.exists(body.data)
    assert.exists(body.data.message)
    assert.exists(body.data.mode)
    assert.isString(body.data.message)
    assert.oneOf(body.data.mode, ['support', 'expert', 'mixed'])
  })

  test('should detect mixed mode for message with both support and expert keywords', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser(client)
    const response = await client
      .post(`${CHAT_URL}/chat`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        message: 'Comment fonctionne le visa en NZ ?',
        sessionId: 'sess_mixed_001',
        page: 'dashboard',
        country: 'NZ',
      })
    response.assertStatus(200)
    const data = response.body().data
    assert.equal(data.mode, 'mixed')
    assert.exists(data.message)
    assert.isString(data.message)
  })

  // --- Optional fields tests ---

  test('should work without optional fields (page, contactId, companyName, country)', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthenticatedUser(client)
    const response = await client
      .post(`${CHAT_URL}/chat`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        message: 'Comment lancer une recherche ?',
        sessionId: 'sess_minimal_001',
      })
    response.assertStatus(200)
    const data = response.body().data
    assert.exists(data.message)
    assert.exists(data.mode)
  })

  test('should work with all optional fields provided', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)
    const response = await client
      .post(`${CHAT_URL}/chat`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        message: 'Tell me about visa sponsorship',
        sessionId: 'sess_full_001',
        page: 'contacts',
        contactId: 'contact-123',
        companyName: 'Test Corp',
        country: 'NZ',
      })
    response.assertStatus(200)
    const data = response.body().data
    assert.exists(data.message)
    assert.exists(data.mode)
  })

  // --- Expert mode resilience ---

  test('should return a non-empty response for expert mode even without OpenRouter key', async ({
    client,
    assert,
  }) => {
    // In test env, OPENROUTER_API_KEY is not set, so expert mode falls back gracefully
    const { token } = await createAuthenticatedUser(client)
    const response = await client
      .post(`${CHAT_URL}/chat`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        message: 'Quels sont les salaires en NZ pour le secteur tech ?',
        sessionId: 'sess_expert_fallback_001',
        page: 'recherche',
        country: 'NZ',
      })
    response.assertStatus(200)
    const data = response.body().data
    assert.equal(data.mode, 'expert')
    assert.exists(data.message)
    assert.isString(data.message)
    // Should be a non-empty fallback message, not a crash
    assert.isAbove(data.message.length, 10)
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

  test('should include mode in assistant history messages', async ({ client, assert }) => {
    const { token } = await createAuthenticatedUser(client)
    const sessionId = 'sess_history_mode_001'

    await client
      .post(`${CHAT_URL}/chat`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        message: 'Comment lancer une recherche ?',
        sessionId,
        page: 'recherche',
      })

    const response = await client
      .get(`${CHAT_URL}/chat/${sessionId}`)
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)
    const history = response.body().data
    const assistantMsg = history.find((m: { role: string }) => m.role === 'assistant')
    assert.exists(assistantMsg)
    assert.exists(assistantMsg.mode)
    assert.oneOf(assistantMsg.mode, ['support', 'expert', 'mixed'])
  })
})
