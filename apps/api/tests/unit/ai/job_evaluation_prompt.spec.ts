import { test } from '@japa/runner'
import {
  buildJobEvaluationPrompt,
  parseJobEvaluationResponse,
  type CandidateForEvaluation,
  type ExclusionForPrompt,
  type JobOfferForEvaluation,
} from '#ai/prompts/job_evaluation_prompt'
import { MAX_DESCRIPTION_LENGTH } from '@expat-hunter/shared'
import { LOCALE_NAMES } from '../../../app/constants/locale.js'

test.group('buildJobEvaluationPrompt', () => {
  const baseOffer: JobOfferForEvaluation = {
    title: 'Senior Developer',
    descriptionRaw: 'Build amazing software for a growing company.',
    location: 'Auckland, NZ',
    salaryMin: 100000,
    salaryMax: 130000,
    salaryCurrency: 'NZD',
    remoteType: 'hybrid',
  }

  const baseProfile: CandidateForEvaluation = {
    skills: ['TypeScript', 'React', 'Node.js'],
    experienceYears: 8,
    targetCountries: ['NZ', 'AU'],
    targetSectors: ['Tech', 'SaaS'],
    targetRoles: ['Developer', 'Tech Lead'],
    cvSummary: 'Experienced fullstack developer',
  }

  test('builds prompt with offer and profile details', ({ assert }) => {
    const { system, user } = buildJobEvaluationPrompt(baseOffer, baseProfile, [])

    assert.include(system, 'career advisor')
    assert.include(system, 'relevanceScore')
    assert.include(system, 'matchSummary')
    assert.include(system, 'selectionReason')
    assert.include(system, 'applicationAdvice')

    assert.include(user, 'Senior Developer')
    assert.include(user, 'Auckland, NZ')
    assert.include(user, '100000-130000 NZD')
    assert.include(user, 'TypeScript, React, Node.js')
    assert.include(user, '8 years')
    assert.include(user, 'NZ, AU')
    assert.include(user, 'Experienced fullstack developer')
  })

  test('includes exclusion history in system prompt', ({ assert }) => {
    const exclusions: ExclusionForPrompt[] = [
      { category: 'salary', reason: 'Below 100k' },
      { category: 'location', reason: 'Too far from Auckland' },
    ]

    const { system } = buildJobEvaluationPrompt(baseOffer, baseProfile, exclusions)

    assert.include(system, 'negative preferences')
    assert.include(system, '[salary] Below 100k')
    assert.include(system, '[location] Too far from Auckland')
  })

  test('handles offer with no description', ({ assert }) => {
    const offer: JobOfferForEvaluation = { ...baseOffer, descriptionRaw: null }
    const { user } = buildJobEvaluationPrompt(offer, baseProfile, [])

    assert.include(user, 'No description available')
  })

  test('truncates very long descriptions', ({ assert }) => {
    // ORACLE: description longer than MAX_DESCRIPTION_LENGTH (5000) is truncated
    const longDescription = 'x'.repeat(MAX_DESCRIPTION_LENGTH + 5000)
    const offer: JobOfferForEvaluation = { ...baseOffer, descriptionRaw: longDescription }
    const { user } = buildJobEvaluationPrompt(offer, baseProfile, [])

    assert.include(user, '(truncated)')
    // The prompt should contain at most MAX_DESCRIPTION_LENGTH chars of description
    assert.isBelow(user.length, longDescription.length)
  })

  test('handles missing salary fields', ({ assert }) => {
    const offer: JobOfferForEvaluation = {
      ...baseOffer,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
    }
    const { user } = buildJobEvaluationPrompt(offer, baseProfile, [])
    assert.include(user, 'Not specified')
  })

  test('handles salary with only min', ({ assert }) => {
    const offer: JobOfferForEvaluation = {
      ...baseOffer,
      salaryMin: 80000,
      salaryMax: null,
      salaryCurrency: 'NZD',
    }
    const { user } = buildJobEvaluationPrompt(offer, baseProfile, [])
    assert.include(user, 'From 80000 NZD')
  })

  test('handles salary with only max', ({ assert }) => {
    const offer: JobOfferForEvaluation = {
      ...baseOffer,
      salaryMin: null,
      salaryMax: 150000,
      salaryCurrency: 'NZD',
    }
    const { user } = buildJobEvaluationPrompt(offer, baseProfile, [])
    assert.include(user, 'Up to 150000 NZD')
  })

  test('handles empty profile (no skills, no CV)', ({ assert }) => {
    const emptyProfile: CandidateForEvaluation = {
      skills: [],
      experienceYears: 0,
      targetCountries: [],
      targetSectors: [],
      targetRoles: [],
      cvSummary: null,
    }
    const { user } = buildJobEvaluationPrompt(baseOffer, emptyProfile, [])
    assert.include(user, 'Not specified')
    assert.notInclude(user, 'CV summary')
  })
})

test.group('buildJobEvaluationPrompt — locale support', () => {
  const baseOffer: JobOfferForEvaluation = {
    title: 'Dev',
    descriptionRaw: 'Job description',
    location: 'Paris',
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    remoteType: null,
  }

  const baseProfile: CandidateForEvaluation = {
    skills: ['TypeScript'],
    experienceYears: 5,
    targetCountries: ['FR'],
    targetSectors: [],
    targetRoles: [],
    cvSummary: null,
  }

  test("locale='fr' adds 'Respond in French' to system prompt", ({ assert }) => {
    // ORACLE: LOCALE_NAMES['fr'] = 'French' → system prompt contains 'Respond in French'
    const { system } = buildJobEvaluationPrompt(baseOffer, baseProfile, [], 'fr')
    assert.include(system, `Respond in ${LOCALE_NAMES['fr']}`)
  })

  test("locale='en' adds 'Respond in English' to system prompt", ({ assert }) => {
    // ORACLE: LOCALE_NAMES['en'] = 'English' → system prompt contains 'Respond in English'
    const { system } = buildJobEvaluationPrompt(baseOffer, baseProfile, [], 'en')
    assert.include(system, `Respond in ${LOCALE_NAMES['en']}`)
  })

  test('locale=undefined defaults to English', ({ assert }) => {
    // ORACLE: undefined locale → fallback to 'en' → 'Respond in English'
    const { system } = buildJobEvaluationPrompt(baseOffer, baseProfile, [], undefined)
    assert.include(system, 'Respond in English')
  })

  test('no locale parameter defaults to English', ({ assert }) => {
    // ORACLE: omitted locale → fallback to 'en' → 'Respond in English'
    const { system } = buildJobEvaluationPrompt(baseOffer, baseProfile, [])
    assert.include(system, 'Respond in English')
  })

  test('invalid locale falls back to English', ({ assert }) => {
    // ORACLE: 'de' not in LOCALE_NAMES → fallback to 'en' → 'Respond in English'
    const { system } = buildJobEvaluationPrompt(baseOffer, baseProfile, [], 'de')
    assert.include(system, 'Respond in English')
  })

  test('empty string locale falls back to English', ({ assert }) => {
    // ORACLE: '' not in LOCALE_NAMES → fallback to 'en' → 'Respond in English'
    const { system } = buildJobEvaluationPrompt(baseOffer, baseProfile, [], '')
    assert.include(system, 'Respond in English')
  })
})

test.group('parseJobEvaluationResponse', () => {
  test('parses valid JSON response', ({ assert }) => {
    const raw = JSON.stringify({
      relevanceScore: 85,
      matchSummary: 'Great match for the candidate.',
      selectionReason: 'Role aligns with target roles.',
      applicationAdvice: 'Highlight TypeScript experience.',
    })

    const result = parseJobEvaluationResponse(raw)

    // ORACLE: valid JSON → structured result with exact values
    assert.isNotNull(result)
    assert.equal(result!.relevanceScore, 85)
    assert.equal(result!.matchSummary, 'Great match for the candidate.')
    assert.equal(result!.selectionReason, 'Role aligns with target roles.')
    assert.equal(result!.applicationAdvice, 'Highlight TypeScript experience.')
  })

  test('parses JSON wrapped in markdown code block', ({ assert }) => {
    const raw = '```json\n' + JSON.stringify({
      relevanceScore: 72,
      matchSummary: 'Decent match.',
      selectionReason: 'Good fit.',
      applicationAdvice: 'Apply early.',
    }) + '\n```'

    const result = parseJobEvaluationResponse(raw)

    assert.isNotNull(result)
    assert.equal(result!.relevanceScore, 72)
  })

  test('clamps score to 0-100 range', ({ assert }) => {
    // ORACLE: score > 100 → clamped to 100
    const raw = JSON.stringify({
      relevanceScore: 150,
      matchSummary: 'Match',
      selectionReason: 'Reason',
      applicationAdvice: 'Advice',
    })

    const result = parseJobEvaluationResponse(raw)
    assert.isNotNull(result)
    assert.equal(result!.relevanceScore, 100)
  })

  test('clamps negative score to 0', ({ assert }) => {
    // ORACLE: score < 0 → clamped to 0
    const raw = JSON.stringify({
      relevanceScore: -10,
      matchSummary: 'Match',
      selectionReason: 'Reason',
      applicationAdvice: 'Advice',
    })

    const result = parseJobEvaluationResponse(raw)
    assert.isNotNull(result)
    assert.equal(result!.relevanceScore, 0)
  })

  test('returns null for invalid JSON', ({ assert }) => {
    const result = parseJobEvaluationResponse('not json at all')
    assert.isNull(result)
  })

  test('returns null for empty string', ({ assert }) => {
    const result = parseJobEvaluationResponse('')
    assert.isNull(result)
  })

  test('provides fallback values for missing fields', ({ assert }) => {
    const raw = JSON.stringify({ relevanceScore: 50 })

    const result = parseJobEvaluationResponse(raw)

    assert.isNotNull(result)
    assert.equal(result!.relevanceScore, 50)
    // ORACLE: missing matchSummary → fallback string
    assert.equal(result!.matchSummary, 'Evaluation could not determine match quality.')
    assert.equal(result!.selectionReason, 'No specific selection reason provided.')
    assert.include(result!.applicationAdvice, 'Review the offer details')
  })

  test('rounds float scores to integers', ({ assert }) => {
    // ORACLE: 73.7 → rounded to 74
    const raw = JSON.stringify({
      relevanceScore: 73.7,
      matchSummary: 'Match',
      selectionReason: 'Reason',
      applicationAdvice: 'Advice',
    })

    const result = parseJobEvaluationResponse(raw)
    assert.isNotNull(result)
    assert.equal(result!.relevanceScore, 74)
  })

  test('handles non-numeric score gracefully', ({ assert }) => {
    // ORACLE: non-numeric score → defaults to 0
    const raw = JSON.stringify({
      relevanceScore: 'high',
      matchSummary: 'Match',
      selectionReason: 'Reason',
      applicationAdvice: 'Advice',
    })

    const result = parseJobEvaluationResponse(raw)
    assert.isNotNull(result)
    assert.equal(result!.relevanceScore, 0)
  })
})
