import { test } from '@japa/runner'
import {
  buildApplicationEmailPrompt,
  parseApplicationEmailResponse,
  COUNTRY_TONE_MAP,
} from '#ai/prompts/application_email_prompt'

test.group('buildApplicationEmailPrompt', () => {
  test('generates system + user prompt with casual-professional tone for NZ', ({ assert }) => {
    // ORACLE: NZ → casual-professional tone
    const { system, user } = buildApplicationEmailPrompt({
      candidateName: 'Jean Dupont',
      offerTitle: 'Senior Frontend Engineer',
      companyName: 'Acme Corp',
      country: 'NZ',
      cvSummary: '8 years React, TypeScript, team lead',
      coverLetterSummary: 'Passionate about building products...',
    })

    assert.isTrue(
      system.includes('casual-professional') || system.includes('casual professional'),
      'system prompt should include casual-professional tone for NZ'
    )
    assert.isTrue(user.includes('Senior Frontend Engineer'))
    assert.isTrue(user.includes('Acme Corp'))
    assert.isTrue(user.includes('Jean Dupont'))
  })

  test('generates formal tone for FR', ({ assert }) => {
    // ORACLE: FR → formal tone
    const { system } = buildApplicationEmailPrompt({
      candidateName: 'Jean Dupont',
      offerTitle: 'Développeur',
      companyName: 'SociétéX',
      country: 'FR',
      cvSummary: 'CV text',
      coverLetterSummary: 'Cover letter text',
    })

    assert.isTrue(system.includes('formal'), 'system prompt should include formal tone for FR')
  })

  test('generates default professional tone for unknown country', ({ assert }) => {
    // ORACLE: JP (unknown in TONE_MAP) → professional (default)
    const { system } = buildApplicationEmailPrompt({
      candidateName: 'Test',
      offerTitle: 'Engineer',
      companyName: 'Corp',
      country: 'JP',
      cvSummary: 'CV',
      coverLetterSummary: 'CL',
    })

    assert.isTrue(
      system.includes('professional'),
      'system prompt should include professional tone for unknown country'
    )
  })

  test('COUNTRY_TONE_MAP has expected entries', ({ assert }) => {
    // ORACLE: NZ/AU → casual-professional, FR/BE → formal
    assert.equal(COUNTRY_TONE_MAP.NZ, 'casual-professional')
    assert.equal(COUNTRY_TONE_MAP.AU, 'casual-professional')
    assert.equal(COUNTRY_TONE_MAP.FR, 'formal')
    assert.equal(COUNTRY_TONE_MAP.BE, 'formal')
  })

  test('sanitizes HTML in inputs', ({ assert }) => {
    const { user } = buildApplicationEmailPrompt({
      candidateName: '<script>alert("xss")</script>',
      offerTitle: 'Test',
      companyName: 'Corp',
      country: 'NZ',
      cvSummary: 'CV',
      coverLetterSummary: 'CL',
    })

    assert.isFalse(user.includes('<script>'), 'HTML should be escaped')
    assert.isTrue(user.includes('&lt;script&gt;'), 'HTML entities should be present')
  })
})

test.group('parseApplicationEmailResponse', () => {
  test('strips markdown fences', ({ assert }) => {
    // ORACLE: "```\nDear Hiring Team,...\n```" → "Dear Hiring Team,..."
    const result = parseApplicationEmailResponse('```\nDear Hiring Team,\n\nPlease find attached...\n```')
    assert.isNotNull(result)
    assert.isFalse(result!.includes('```'))
    assert.isTrue(result!.startsWith('Dear'))
  })

  test('returns as-is when no fences', ({ assert }) => {
    // ORACLE: plain text → returned trimmed
    const input = 'Dear Hiring Team,\n\nI am writing to apply...'
    const result = parseApplicationEmailResponse(input)
    assert.equal(result, input)
  })

  test('returns null for empty response', ({ assert }) => {
    const result = parseApplicationEmailResponse('')
    assert.isNull(result)
  })

  test('returns null for whitespace-only response', ({ assert }) => {
    const result = parseApplicationEmailResponse('   \n  ')
    assert.isNull(result)
  })
})
