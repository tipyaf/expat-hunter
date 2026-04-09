import { test } from '@japa/runner'
import JobCvGenerationService from '#services/job_cv_generation_service'

test.group('JobCvGenerationService.deduceLanguage', () => {
  const service = new JobCvGenerationService()

  test('returns en for English-speaking countries', ({ assert }) => {
    // ORACLE: NZ → en, AU → en, GB → en, SG → en
    assert.equal(service.deduceLanguage(['NZ']), 'en')
    assert.equal(service.deduceLanguage(['AU']), 'en')
    assert.equal(service.deduceLanguage(['GB']), 'en')
    assert.equal(service.deduceLanguage(['SG']), 'en')
    assert.equal(service.deduceLanguage(['AE']), 'en')
  })

  test('returns fr for French-speaking countries', ({ assert }) => {
    // ORACLE: FR → fr, CH → fr
    assert.equal(service.deduceLanguage(['FR']), 'fr')
    assert.equal(service.deduceLanguage(['CH']), 'fr')
  })

  test('uses first country in list', ({ assert }) => {
    // ORACLE: first country determines language
    assert.equal(service.deduceLanguage(['FR', 'NZ', 'AU']), 'fr')
    assert.equal(service.deduceLanguage(['NZ', 'FR']), 'en')
  })

  test('returns en for empty array', ({ assert }) => {
    // ORACLE: no countries → default en
    assert.equal(service.deduceLanguage([]), 'en')
  })

  test('returns en for unknown country code', ({ assert }) => {
    // ORACLE: unknown code → default en
    assert.equal(service.deduceLanguage(['XX']), 'en')
  })

  test('returns en for null/undefined input', ({ assert }) => {
    // ORACLE: null → default en
    assert.equal(service.deduceLanguage(null as unknown as string[]), 'en')
    assert.equal(service.deduceLanguage(undefined as unknown as string[]), 'en')
  })
})
