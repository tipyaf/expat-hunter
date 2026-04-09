import { test } from '@japa/runner'
import {
  buildCvAdaptationPrompt,
  buildCvRefinementPrompt,
  parseCvAdaptationResponse,
  type CvAdaptationContext,
  type CvAdaptationRefinementContext,
} from '#ai/prompts/cv_adaptation_prompt'

test.group('buildCvAdaptationPrompt', () => {
  const baseContext: CvAdaptationContext = {
    cvText: '5 years of experience in web development with React and Node.js.',
    offerTitle: 'Senior Full-Stack Developer',
    offerDescription: 'We need 8+ years React experience and strong TypeScript skills.',
    companyName: 'TechCorp',
    companySector: 'SaaS',
    applicationAdvice: 'Highlight TypeScript expertise',
    language: 'en',
  }

  test('builds prompt with offer and CV details', ({ assert }) => {
    const { system, user } = buildCvAdaptationPrompt(baseContext)

    assert.include(system, 'career advisor')
    assert.include(system, 'replacements')
    assert.include(system, '7')
    assert.include(system, 'English')

    assert.include(user, 'Senior Full-Stack Developer')
    assert.include(user, 'TechCorp')
    assert.include(user, 'SaaS')
    assert.include(user, '5 years of experience')
    assert.include(user, 'Highlight TypeScript expertise')
  })

  test('uses French when language is fr', ({ assert }) => {
    const { system } = buildCvAdaptationPrompt({ ...baseContext, language: 'fr' })
    assert.include(system, 'French')
  })

  test('handles missing company name', ({ assert }) => {
    const { user } = buildCvAdaptationPrompt({
      ...baseContext,
      companyName: null,
      companySector: null,
    })
    assert.notInclude(user, 'TechCorp')
  })

  test('handles missing offer description', ({ assert }) => {
    const { user } = buildCvAdaptationPrompt({
      ...baseContext,
      offerDescription: null,
    })
    assert.include(user, 'No description available')
  })

  test('handles missing application advice', ({ assert }) => {
    const { user } = buildCvAdaptationPrompt({
      ...baseContext,
      applicationAdvice: null,
    })
    assert.notInclude(user, 'Application Advice')
  })

  test('sanitizes HTML in CV text', ({ assert }) => {
    const { user } = buildCvAdaptationPrompt({
      ...baseContext,
      cvText: '<script>alert("xss")</script>',
    })
    assert.notInclude(user, '<script>')
    assert.include(user, '&lt;script&gt;')
  })

  test('truncates long CV text', ({ assert }) => {
    const longCv = 'A'.repeat(10000)
    const { user } = buildCvAdaptationPrompt({
      ...baseContext,
      cvText: longCv,
    })
    assert.include(user, '(truncated)')
  })
})

test.group('buildCvRefinementPrompt', () => {
  const baseContext: CvAdaptationRefinementContext = {
    cvText: '5 years of experience in web development.',
    offerTitle: 'Senior Developer',
    offerDescription: 'Looking for 8+ years experience.',
    companyName: 'TechCorp',
    companySector: null,
    applicationAdvice: null,
    language: 'en',
    previousReplacements: [
      { oldText: '5 years', newText: '8+ years' },
    ],
    userInstruction: 'Emphasize leadership experience',
  }

  test('includes previous replacements and user instruction', ({ assert }) => {
    const { user } = buildCvRefinementPrompt(baseContext)

    assert.include(user, '5 years')
    assert.include(user, '8+ years')
    assert.include(user, 'Emphasize leadership experience')
    assert.include(user, 'Previous Replacements')
  })

  test('handles empty previous replacements', ({ assert }) => {
    const { user } = buildCvRefinementPrompt({
      ...baseContext,
      previousReplacements: [],
    })
    assert.include(user, 'None')
  })
})

test.group('parseCvAdaptationResponse', () => {
  test('parses valid JSON with replacements', ({ assert }) => {
    // ORACLE: valid JSON → 2 replacements extracted
    const raw = JSON.stringify({
      replacements: [
        { oldText: '5 years', newText: '8+ years' },
        { oldText: 'web developer', newText: 'full-stack engineer' },
      ],
    })

    const result = parseCvAdaptationResponse(raw)

    assert.isNotNull(result)
    assert.lengthOf(result!.replacements, 2)
    assert.equal(result!.replacements[0].oldText, '5 years')
    assert.equal(result!.replacements[0].newText, '8+ years')
    assert.equal(result!.replacements[1].oldText, 'web developer')
    assert.equal(result!.replacements[1].newText, 'full-stack engineer')
  })

  test('handles markdown-wrapped JSON', ({ assert }) => {
    // ORACLE: markdown code fence stripped → valid result
    const raw = '```json\n{"replacements": [{"oldText": "old", "newText": "new"}]}\n```'

    const result = parseCvAdaptationResponse(raw)

    assert.isNotNull(result)
    assert.lengthOf(result!.replacements, 1)
  })

  test('returns empty array for no replacements', ({ assert }) => {
    // ORACLE: empty replacements array → empty result
    const raw = JSON.stringify({ replacements: [] })

    const result = parseCvAdaptationResponse(raw)

    assert.isNotNull(result)
    assert.lengthOf(result!.replacements, 0)
  })

  test('caps replacements at 7', ({ assert }) => {
    // ORACLE: 10 replacements → capped at 7
    const replacements = Array.from({ length: 10 }, (_, i) => ({
      oldText: `old${i}`,
      newText: `new${i}`,
    }))
    const raw = JSON.stringify({ replacements })

    const result = parseCvAdaptationResponse(raw)

    assert.isNotNull(result)
    assert.lengthOf(result!.replacements, 7)
  })

  test('filters out invalid replacements', ({ assert }) => {
    // ORACLE: invalid items filtered, only valid ones kept
    const raw = JSON.stringify({
      replacements: [
        { oldText: 'valid', newText: 'also valid' },
        { oldText: '', newText: 'empty old' },
        { oldText: 'no new text' },
        { oldText: 123, newText: 'number old' },
        null,
      ],
    })

    const result = parseCvAdaptationResponse(raw)

    assert.isNotNull(result)
    assert.lengthOf(result!.replacements, 1)
    assert.equal(result!.replacements[0].oldText, 'valid')
  })

  test('returns null for invalid JSON', ({ assert }) => {
    // ORACLE: garbage input → null
    const result = parseCvAdaptationResponse('not json at all')
    assert.isNull(result)
  })

  test('returns empty for missing replacements key', ({ assert }) => {
    // ORACLE: valid JSON but no replacements → empty array
    const raw = JSON.stringify({ something: 'else' })

    const result = parseCvAdaptationResponse(raw)

    assert.isNotNull(result)
    assert.lengthOf(result!.replacements, 0)
  })
})
