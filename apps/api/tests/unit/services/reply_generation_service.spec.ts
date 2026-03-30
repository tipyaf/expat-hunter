import { test } from '@japa/runner'
import ReplyGenerationService from '#services/reply_generation_service'

/**
 * Unit tests for ReplyGenerationService.
 *
 * The service depends on OpenRouterClient (external AI API), so we test:
 * 1. Prompt construction logic by inspecting what the service builds
 * 2. Fallback behavior when the AI client is unavailable
 * 3. Error handling paths
 *
 * We mock OpenRouterClient.forFeature to control AI availability and capture prompts.
 */

/** Captured chat call arguments for inspection. */
interface CapturedChat {
  messages: { role: string; content: string }[]
  temperature: number
  maxTokens: number
}

/**
 * Creates a mock OpenRouterClient that captures the prompt and returns a canned response.
 */
function makeMockClient(response: string = 'Mock AI reply') {
  const captured: CapturedChat[] = []
  return {
    captured,
    client: {
      chat: async (params: CapturedChat) => {
        captured.push(params)
        return response
      },
    },
  }
}

/**
 * Installs a mock for OpenRouterClient.forFeature on the module level.
 * Returns a restore function.
 */
async function mockOpenRouterClient(mockClient: any) {
  const mod = await import('#ai/openrouter_client')
  const original = mod.default.forFeature
  mod.default.forFeature = async () => mockClient
  return () => {
    mod.default.forFeature = original
  }
}

test.group('ReplyGenerationService — generateReply', (group) => {
  const service = new ReplyGenerationService()
  let restore: (() => void) | null = null

  group.teardown(async () => {
    if (restore) restore()
  })

  test('returns fallback message in English when AI client is null', async ({ assert }) => {
    restore = await mockOpenRouterClient(null)

    const result = await service.generateReply({
      contactFullName: 'John Doe',
      companyName: 'Acme Corp',
      originalEmailBody: 'I am interested in the role.',
      replyBody: 'Thank you for your interest.',
      language: 'en',
    })

    assert.include(result, 'not configured')
  })

  test('returns fallback message in French when AI client is null', async ({ assert }) => {
    restore = await mockOpenRouterClient(null)

    const result = await service.generateReply({
      contactFullName: 'Jean Dupont',
      companyName: 'Société Exemple',
      originalEmailBody: 'Je suis intéressé.',
      replyBody: 'Merci pour votre candidature.',
      language: 'fr',
    })

    assert.include(result, 'pas configurée')
  })

  test('prompt includes contact name, company, and language directive', async ({ assert }) => {
    const mock = makeMockClient('Great reply!')
    restore = await mockOpenRouterClient(mock.client)

    await service.generateReply({
      contactFullName: 'Alice Smith',
      companyName: 'TechCorp',
      originalEmailBody: 'Original email content here',
      replyBody: 'Their reply to me',
      language: 'en',
    })

    assert.equal(mock.captured.length, 1)
    const prompt = mock.captured[0].messages[0].content
    assert.include(prompt, 'Alice Smith')
    assert.include(prompt, 'TechCorp')
    assert.include(prompt, 'English')
  })

  test('prompt includes French language when language=fr', async ({ assert }) => {
    const mock = makeMockClient('Réponse en français')
    restore = await mockOpenRouterClient(mock.client)

    await service.generateReply({
      contactFullName: 'Marie Curie',
      companyName: 'Labo Inc',
      originalEmailBody: 'Email original',
      replyBody: 'Réponse reçue',
      language: 'fr',
    })

    const prompt = mock.captured[0].messages[0].content
    assert.include(prompt, 'French')
  })

  test('prompt includes country context when targetCountry is set', async ({ assert }) => {
    const mock = makeMockClient('NZ style reply')
    restore = await mockOpenRouterClient(mock.client)

    await service.generateReply({
      contactFullName: 'Bob',
      companyName: 'KiwiCo',
      originalEmailBody: 'Hello',
      replyBody: 'Kia ora!',
      targetCountry: 'New Zealand',
    })

    const prompt = mock.captured[0].messages[0].content
    assert.include(prompt, 'New Zealand')
    assert.include(prompt, 'cultural norms')
  })

  test('prompt includes user profile and CV background when provided', async ({ assert }) => {
    const mock = makeMockClient('Tailored reply')
    restore = await mockOpenRouterClient(mock.client)

    await service.generateReply({
      contactFullName: 'HR Manager',
      companyName: 'BigCorp',
      originalEmailBody: 'We have an opening',
      replyBody: 'Sounds interesting',
      userProfile: {
        fullName: 'Yannick B.',
        cvText: 'Senior full-stack developer with 15 years of experience in Node.js, React, and cloud architecture.',
      },
    })

    const prompt = mock.captured[0].messages[0].content
    assert.include(prompt, 'Yannick B.')
    assert.include(prompt, 'Senior full-stack developer')
  })

  test('prompt omits country line when targetCountry is not set', async ({ assert }) => {
    const mock = makeMockClient('Generic reply')
    restore = await mockOpenRouterClient(mock.client)

    await service.generateReply({
      contactFullName: 'Contact',
      companyName: 'Company',
      originalEmailBody: 'Email',
      replyBody: 'Reply',
    })

    const prompt = mock.captured[0].messages[0].content
    assert.notInclude(prompt, 'Country context')
    assert.notInclude(prompt, 'cultural norms')
  })

  test('uses correct AI parameters (temperature and maxTokens)', async ({ assert }) => {
    const mock = makeMockClient('reply')
    restore = await mockOpenRouterClient(mock.client)

    await service.generateReply({
      contactFullName: 'A',
      companyName: 'B',
      originalEmailBody: 'C',
      replyBody: 'D',
    })

    // ORACLE: AI_TEMPERATURE_DEFAULT = 0.5, AI_MAX_TOKENS_SHORT = 512
    assert.equal(mock.captured[0].temperature, 0.5)
    assert.equal(mock.captured[0].maxTokens, 512)
  })

  test('returns English error fallback when AI call throws', async ({ assert }) => {
    const errorClient = {
      chat: async () => {
        throw new Error('API timeout')
      },
    }
    restore = await mockOpenRouterClient(errorClient)

    const result = await service.generateReply({
      contactFullName: 'X',
      companyName: 'Y',
      originalEmailBody: 'Z',
      replyBody: 'W',
      language: 'en',
    })

    assert.include(result, 'Unable to generate')
  })

  test('returns French error fallback when AI call throws and language=fr', async ({ assert }) => {
    const errorClient = {
      chat: async () => {
        throw new Error('API error')
      },
    }
    restore = await mockOpenRouterClient(errorClient)

    const result = await service.generateReply({
      contactFullName: 'X',
      companyName: 'Y',
      originalEmailBody: 'Z',
      replyBody: 'W',
      language: 'fr',
    })

    assert.include(result, 'Impossible de générer')
  })
})

test.group('ReplyGenerationService — summarizeThread', () => {
  const service = new ReplyGenerationService()

  test('returns empty string when AI client is null', async ({ assert }) => {
    const restore = await mockOpenRouterClient(null)

    const result = await service.summarizeThread([])
    assert.equal(result, '')

    restore()
  })

  test('returns empty string when thread is empty (no replies, no original)', async ({ assert }) => {
    const mock = makeMockClient('summary')
    const restore = await mockOpenRouterClient(mock.client)

    const result = await service.summarizeThread([])
    assert.equal(result, '')
    // Should not even call the AI when there is nothing to summarize
    assert.equal(mock.captured.length, 0)

    restore()
  })
})
