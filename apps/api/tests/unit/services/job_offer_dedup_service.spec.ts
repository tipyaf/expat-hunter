import { test } from '@japa/runner'
import { DEDUP_RULES } from '@expat-hunter/shared'
import JobOfferDedupService from '../../../app/services/job_offer_dedup_service.js'

test.group('JobOfferDedupService', () => {
  const service = new JobOfferDedupService()

  // --- normalize ---

  test('normalize lowercases and trims input', ({ assert }) => {
    // ORACLE: "  Acme Corp  " → "acme" (Corp is a company suffix and gets stripped)
    assert.equal(service.normalize('  Acme Corp  '), 'acme')
  })

  test('normalize strips common company suffixes', ({ assert }) => {
    // ORACLE: "Acme Ltd" → "acme", "Tech Corp" → "tech"
    assert.equal(service.normalize('Acme Ltd'), 'acme')
    assert.equal(service.normalize('Tech Corp'), 'tech')
    assert.equal(service.normalize('BigCo Limited'), 'bigco')
    assert.equal(service.normalize('Startup Pty'), 'startup')
    assert.equal(service.normalize('Company GmbH'), 'company')
  })

  test('normalize preserves strings without suffixes', ({ assert }) => {
    // ORACLE: "Google" → "google"
    assert.equal(service.normalize('Google'), 'google')
  })

  // --- normalizeLocation ---

  test('normalizeLocation expands common abbreviations', ({ assert }) => {
    // ORACLE: "Auckland, NZ" → "auckland, new zealand"
    assert.equal(service.normalizeLocation('Auckland, NZ'), 'auckland, new zealand')
    assert.equal(service.normalizeLocation('Sydney, AU'), 'sydney, australia')
    assert.equal(service.normalizeLocation('London, UK'), 'london, united kingdom')
  })

  test('normalizeLocation lowercases and trims', ({ assert }) => {
    // ORACLE: "  New York  " → "new york"
    assert.equal(service.normalizeLocation('  New York  '), 'new york')
  })

  // --- diceCoefficient ---

  test('diceCoefficient returns 1 for identical strings', ({ assert }) => {
    // ORACLE: identical strings → 1.0
    assert.equal(service.diceCoefficient('hello', 'hello'), 1)
  })

  test('diceCoefficient returns 0 for completely different strings', ({ assert }) => {
    // ORACLE: no shared bigrams → 0
    assert.equal(service.diceCoefficient('ab', 'cd'), 0)
  })

  test('diceCoefficient returns value between 0 and 1 for similar strings', ({ assert }) => {
    // ORACLE: "senior developer" vs "senior dev" should be > 0.5
    const result = service.diceCoefficient('senior developer', 'senior dev')
    assert.isAbove(result, 0.5)
    assert.isBelow(result, 1)
  })

  test('diceCoefficient handles short strings', ({ assert }) => {
    // ORACLE: identical single chars → 1 (early return), different single chars → 0
    assert.equal(service.diceCoefficient('a', 'a'), 1)
    assert.equal(service.diceCoefficient('a', 'b'), 0)
  })

  test('diceCoefficient detects high similarity for near-duplicates', ({ assert }) => {
    // ORACLE: "senior developer" vs "senior developers" → above 0.85 threshold
    const result = service.diceCoefficient('senior developer', 'senior developers')
    assert.isAbove(result, 0.85)
  })

  test('diceCoefficient detects low similarity for different titles', ({ assert }) => {
    // ORACLE: "backend engineer" vs "marketing manager" → below 0.5
    const result = service.diceCoefficient('backend engineer', 'marketing manager')
    assert.isBelow(result, 0.5)
  })

  // --- DEDUP_RULES constants ---

  test('DEDUP_RULES are correctly imported from shared', ({ assert }) => {
    // ORACLE: threshold = 0.85
    assert.equal(DEDUP_RULES.SIMILARITY_THRESHOLD, 0.85)
    assert.isArray(DEDUP_RULES.COMPANY_SUFFIXES)
    assert.isTrue(DEDUP_RULES.COMPANY_SUFFIXES.includes('ltd'))
    assert.instanceOf(DEDUP_RULES.LOCATION_NORMALIZATIONS, Map)
  })

  // --- AI dedup fail-open behavior ---

  test('constructor accepts custom OpenRouter client', ({ assert }) => {
    // ORACLE: If OpenRouter is unavailable, service still constructs
    const mockClient = { isConfigured: false, chat: async () => '' } as any
    const svc = new JobOfferDedupService(mockClient)
    assert.instanceOf(svc, JobOfferDedupService)
  })

  test('dedup returns zero results for empty input', async ({ assert }) => {
    // ORACLE: empty newOffers → {duplicates: 0, republished: 0, aiCalls: 0}
    const svc = new JobOfferDedupService()
    const result = await svc.dedup('test-search-id', [])
    assert.deepEqual(result, { duplicates: 0, republished: 0, aiCalls: 0 })
  })
})
