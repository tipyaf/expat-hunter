import { test } from '@japa/runner'
import { deduceLanguage } from '#constants/language'

test.group('deduceLanguage (used by JobCvGenerationService)', () => {
  test('returns en for English-speaking countries', ({ assert }) => {
    // ORACLE: NZ → en, AU → en, GB → en, SG → en
    assert.equal(deduceLanguage(['NZ']), 'en')
    assert.equal(deduceLanguage(['AU']), 'en')
    assert.equal(deduceLanguage(['GB']), 'en')
    assert.equal(deduceLanguage(['SG']), 'en')
    assert.equal(deduceLanguage(['AE']), 'en')
  })

  test('returns fr for French-speaking countries', ({ assert }) => {
    // ORACLE: FR → fr, CH → fr
    assert.equal(deduceLanguage(['FR']), 'fr')
    assert.equal(deduceLanguage(['CH']), 'fr')
  })

  test('uses first country in list', ({ assert }) => {
    // ORACLE: first country determines language
    assert.equal(deduceLanguage(['FR', 'NZ', 'AU']), 'fr')
    assert.equal(deduceLanguage(['NZ', 'FR']), 'en')
  })

  test('returns en for empty array', ({ assert }) => {
    // ORACLE: no countries → default en
    assert.equal(deduceLanguage([]), 'en')
  })

  test('returns en for unknown country code', ({ assert }) => {
    // ORACLE: unknown code → default en
    assert.equal(deduceLanguage(['XX']), 'en')
  })

  test('returns en for null/undefined input', ({ assert }) => {
    // ORACLE: null → default en
    assert.equal(deduceLanguage(null as unknown as string[]), 'en')
    assert.equal(deduceLanguage(undefined as unknown as string[]), 'en')
  })
})
