import { test } from '@japa/runner'
import EmailGenerationService from '#services/email_generation_service'

/**
 * Unit tests for EmailGenerationService.
 *
 * Since the service relies heavily on Lucid models and the EmailComposer (which
 * calls OpenRouter), we test the constructor and the early-exit paths that don't
 * require a database connection. The integration tests cover the full flow.
 */

test.group('EmailGenerationService — constructor & configuration checks', () => {
  test('constructor creates instance without arguments', ({ assert }) => {
    const service = new EmailGenerationService()
    assert.instanceOf(service, EmailGenerationService)
  })

  test('constructor accepts a custom EmailComposer', ({ assert }) => {
    // Provide a mock composer that reports not configured
    const mockComposer = {
      isConfigured: false,
      compose: async () => ({ subject: 'test', body: 'test' }),
    } as any

    const service = new EmailGenerationService(mockComposer)
    assert.instanceOf(service, EmailGenerationService)
  })

  test('generateForContacts returns zero results when composer is not configured', async ({
    assert,
  }) => {
    const mockComposer = {
      isConfigured: false,
      compose: async () => ({ subject: 'test', body: 'test' }),
    } as any

    const service = new EmailGenerationService(mockComposer)
    const result = await service.generateForContacts('fake-user-id')

    assert.equal(result.generated, 0)
    assert.equal(result.errors, 0)
    assert.equal(result.skipped, 0)
    assert.deepEqual(result.emailIds, [])
  })

  test('generateForContacts returns zero results with batchSize option when not configured', async ({
    assert,
  }) => {
    const mockComposer = {
      isConfigured: false,
      compose: async () => ({ subject: 'test', body: 'test' }),
    } as any

    const service = new EmailGenerationService(mockComposer)
    const result = await service.generateForContacts('fake-user-id', {
      contactIds: ['id-1', 'id-2'],
      batchSize: 5,
    })

    assert.equal(result.generated, 0)
    assert.equal(result.errors, 0)
    assert.equal(result.skipped, 0)
    assert.deepEqual(result.emailIds, [])
  })

  test('generateOne returns null when composer is not configured', async ({ assert }) => {
    const mockComposer = {
      isConfigured: false,
      compose: async () => ({ subject: 'test', body: 'test' }),
    } as any

    const service = new EmailGenerationService(mockComposer)
    const result = await service.generateOne('fake-contact-id', 'fake-user-id')

    assert.isNull(result)
  })

  test('regenerate returns null when composer is not configured', async ({ assert }) => {
    const mockComposer = {
      isConfigured: false,
      compose: async () => ({ subject: 'test', body: 'test' }),
    } as any

    const service = new EmailGenerationService(mockComposer)
    const result = await service.regenerate('fake-email-id', 'fake-user-id')

    assert.isNull(result)
  })
})

test.group('EmailGenerationService — presetId option', () => {
  test('generateForContacts accepts presetId in options without error when not configured', async ({
    assert,
  }) => {
    const mockComposer = {
      isConfigured: false,
      compose: async () => ({ subject: 'test', body: 'test' }),
    } as any

    const service = new EmailGenerationService(mockComposer)
    const result = await service.generateForContacts('fake-user-id', {
      contactIds: ['id-1'],
      presetId: 'some-preset-id',
    })

    assert.equal(result.generated, 0)
    assert.equal(result.errors, 0)
    assert.deepEqual(result.emailIds, [])
  })

  test('generateForContacts accepts presetId alongside batchSize', async ({
    assert,
  }) => {
    const mockComposer = {
      isConfigured: false,
      compose: async () => ({ subject: 'test', body: 'test' }),
    } as any

    const service = new EmailGenerationService(mockComposer)
    const result = await service.generateForContacts('fake-user-id', {
      batchSize: 3,
      presetId: 'preset-123',
    })

    assert.equal(result.generated, 0)
    assert.deepEqual(result.emailIds, [])
  })

  test('generateForContacts works without presetId (backward compatible)', async ({
    assert,
  }) => {
    const mockComposer = {
      isConfigured: false,
      compose: async () => ({ subject: 'test', body: 'test' }),
    } as any

    const service = new EmailGenerationService(mockComposer)
    const result = await service.generateForContacts('fake-user-id', {
      contactIds: ['id-1'],
    })

    assert.equal(result.generated, 0)
    assert.deepEqual(result.emailIds, [])
  })
})

test.group('EmailGenerationService — GenerationResult shape', () => {
  test('result object has all required fields', async ({ assert }) => {
    const mockComposer = {
      isConfigured: false,
      compose: async () => ({ subject: 'test', body: 'test' }),
    } as any

    const service = new EmailGenerationService(mockComposer)
    const result = await service.generateForContacts('any-user-id')

    assert.properties(result, ['generated', 'errors', 'skipped', 'emailIds'])
    assert.isNumber(result.generated)
    assert.isNumber(result.errors)
    assert.isNumber(result.skipped)
    assert.isArray(result.emailIds)
  })
})
