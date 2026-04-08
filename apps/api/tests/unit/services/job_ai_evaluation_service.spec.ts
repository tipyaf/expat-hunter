import { test } from '@japa/runner'
import {
  EVALUATION_BATCH_SIZE,
  MAX_DESCRIPTION_LENGTH,
  EXCLUSION_CATEGORIES,
} from '@expat-hunter/shared'

test.group('JobAiEvaluationService — constants and imports', () => {
  test('EVALUATION_BATCH_SIZE is 10', ({ assert }) => {
    // ORACLE: EVALUATION_BATCH_SIZE = 10 (from story AC-FUNC-JAE-05)
    assert.equal(EVALUATION_BATCH_SIZE, 10)
  })

  test('MAX_DESCRIPTION_LENGTH is 5000', ({ assert }) => {
    // ORACLE: MAX_DESCRIPTION_LENGTH = 5000 (from story edge case)
    assert.equal(MAX_DESCRIPTION_LENGTH, 5000)
  })

  test('EXCLUSION_CATEGORIES contains expected values', ({ assert }) => {
    // ORACLE: 6 categories from story scope
    assert.deepEqual([...EXCLUSION_CATEGORIES], [
      'salary',
      'location',
      'company',
      'role',
      'contract',
      'other',
    ])
  })

  test('service module can be imported', async ({ assert }) => {
    const mod = await import('#services/job_ai_evaluation_service')
    assert.isFunction(mod.default)
  })

  test('service constructor accepts optional OpenRouterClient', async ({ assert }) => {
    const { default: JobAiEvaluationService } = await import('#services/job_ai_evaluation_service')
    // Instantiate with no args — should not throw
    const service = new JobAiEvaluationService()
    assert.isDefined(service)
  })

  test('evaluate method exists on service', async ({ assert }) => {
    const { default: JobAiEvaluationService } = await import('#services/job_ai_evaluation_service')
    const service = new JobAiEvaluationService()
    assert.isFunction(service.evaluate)
  })

  test('evaluateForSearch method exists on service', async ({ assert }) => {
    const { default: JobAiEvaluationService } = await import('#services/job_ai_evaluation_service')
    const service = new JobAiEvaluationService()
    assert.isFunction(service.evaluateForSearch)
  })
})

test.group('JobAiEvaluationService — evaluate (mocked OpenRouter)', () => {
  test('evaluate builds prompt and parses response', async ({ assert }) => {
    const { default: JobAiEvaluationService } = await import('#services/job_ai_evaluation_service')

    // Create a mock client that returns a valid evaluation response
    const mockResponse = JSON.stringify({
      relevanceScore: 85,
      matchSummary: 'Strong match for the candidate.',
      selectionReason: 'Skills align perfectly.',
      applicationAdvice: 'Emphasize TypeScript experience.',
    })

    const mockClient = {
      isConfigured: true,
      chat: async () => mockResponse,
    } as any

    const service = new JobAiEvaluationService(mockClient)

    const result = await service.evaluate(
      {
        title: 'Senior Developer',
        descriptionRaw: 'Build amazing software.',
        location: 'Auckland, NZ',
        salaryMin: 100000,
        salaryMax: 130000,
        salaryCurrency: 'NZD',
        remoteType: 'hybrid',
      },
      {
        skills: ['TypeScript', 'React'],
        experienceYears: 8,
        targetCountries: ['NZ'],
        targetSectors: ['Tech'],
        targetRoles: ['Developer'],
        cvSummary: null,
      },
      []
    )

    // ORACLE: result matches mock response values
    assert.isNotNull(result)
    assert.equal(result!.relevanceScore, 85)
    assert.equal(result!.matchSummary, 'Strong match for the candidate.')
    assert.equal(result!.selectionReason, 'Skills align perfectly.')
    assert.equal(result!.applicationAdvice, 'Emphasize TypeScript experience.')
  })

  test('evaluate returns null when OpenRouter returns malformed JSON', async ({ assert }) => {
    const { default: JobAiEvaluationService } = await import('#services/job_ai_evaluation_service')

    const mockClient = {
      isConfigured: true,
      chat: async () => 'This is not JSON',
    } as any

    const service = new JobAiEvaluationService(mockClient)

    const result = await service.evaluate(
      { title: 'Dev', descriptionRaw: null, location: null, salaryMin: null, salaryMax: null, salaryCurrency: null, remoteType: null },
      { skills: [], experienceYears: 0, targetCountries: [], targetSectors: [], targetRoles: [], cvSummary: null },
      []
    )

    // ORACLE: malformed JSON → null (fail open)
    assert.isNull(result)
  })

  test('evaluate passes exclusions to prompt builder', async ({ assert }) => {
    const { default: JobAiEvaluationService } = await import('#services/job_ai_evaluation_service')

    let capturedMessages: any[] = []
    const mockClient = {
      isConfigured: true,
      chat: async (params: any) => {
        capturedMessages = params.messages
        return JSON.stringify({
          relevanceScore: 40,
          matchSummary: 'Low match.',
          selectionReason: 'Salary mismatch.',
          applicationAdvice: 'Consider negotiating.',
        })
      },
    } as any

    const service = new JobAiEvaluationService(mockClient)

    await service.evaluate(
      { title: 'Dev', descriptionRaw: 'desc', location: 'Auckland', salaryMin: null, salaryMax: null, salaryCurrency: null, remoteType: null },
      { skills: ['Go'], experienceYears: 5, targetCountries: ['NZ'], targetSectors: [], targetRoles: ['Developer'], cvSummary: null },
      [{ category: 'salary', reason: 'Below 100k' }]
    )

    // ORACLE: system prompt includes exclusion
    const systemMsg = capturedMessages.find((m: any) => m.role === 'system')
    assert.include(systemMsg.content, 'Below 100k')
    assert.include(systemMsg.content, 'negative preferences')
  })
})
