import { test } from '@japa/runner'
import {
  buildCoverLetterPrompt,
  buildCoverLetterRefinementPrompt,
  parseCoverLetterResponse,
  type CoverLetterContext,
  type CoverLetterRefinementContext,
  MAX_COVER_LETTER_LENGTH,
} from '#ai/prompts/cover_letter_prompt'

test.group('buildCoverLetterPrompt', () => {
  const baseContext: CoverLetterContext = {
    cvText: '5 years of experience in web development with React and Node.js.',
    offerTitle: 'Senior Full-Stack Developer',
    offerDescription: 'We need 8+ years React experience and strong TypeScript skills.',
    companyName: 'TechCorp',
    companySector: 'SaaS',
    companySize: '50-200',
    companyType: 'hiring_company',
    applicationAdvice: 'Highlight TypeScript expertise',
    language: 'en',
  }

  test('builds prompt with offer and CV details', ({ assert }) => {
    const { system, user } = buildCoverLetterPrompt(baseContext)

    // ORACLE: system prompt contains career advisor role and cover letter instructions
    assert.include(system, 'career advisor')
    assert.include(system, 'cover letter')
    assert.include(system, 'English')

    // ORACLE: user prompt contains offer details, company, CV, and advice
    assert.include(user, 'Senior Full-Stack Developer')
    assert.include(user, 'TechCorp')
    assert.include(user, 'SaaS')
    assert.include(user, '5 years of experience')
    assert.include(user, 'Highlight TypeScript expertise')
  })

  test('uses French when language is fr', ({ assert }) => {
    const { system } = buildCoverLetterPrompt({ ...baseContext, language: 'fr' })
    // ORACLE: French language instruction in system prompt
    assert.include(system, 'French')
  })

  test('handles missing company name', ({ assert }) => {
    const { user } = buildCoverLetterPrompt({
      ...baseContext,
      companyName: null,
      companySector: null,
      companySize: null,
    })
    // ORACLE: no company name → not in prompt
    assert.notInclude(user, 'TechCorp')
  })

  test('handles missing offer description', ({ assert }) => {
    const { user } = buildCoverLetterPrompt({
      ...baseContext,
      offerDescription: null,
    })
    // ORACLE: null description → fallback text
    assert.include(user, 'No description available')
  })

  test('handles missing application advice', ({ assert }) => {
    const { user } = buildCoverLetterPrompt({
      ...baseContext,
      applicationAdvice: null,
    })
    // ORACLE: no advice → section absent
    assert.notInclude(user, 'Application Advice')
  })

  test('sanitizes HTML in inputs', ({ assert }) => {
    const { user } = buildCoverLetterPrompt({
      ...baseContext,
      cvText: '<script>alert("xss")</script>',
    })
    // ORACLE: HTML tags escaped to entities
    assert.notInclude(user, '<script>')
    assert.include(user, '&lt;script&gt;')
  })

  test('truncates long CV text', ({ assert }) => {
    const longCv = 'A'.repeat(10000)
    const { user } = buildCoverLetterPrompt({
      ...baseContext,
      cvText: longCv,
    })
    // ORACLE: text exceeding MAX_CV_LENGTH is truncated
    assert.include(user, '(truncated)')
  })

  test('excludes companySector and companySize for recruitment_agency', ({ assert }) => {
    const { user } = buildCoverLetterPrompt({
      ...baseContext,
      companyType: 'recruitment_agency',
    })
    // ORACLE: recruitment_agency → sector and size omitted from prompt
    assert.notInclude(user, 'SaaS')
    assert.notInclude(user, '50-200')
    // ORACLE: company name still present
    assert.include(user, 'TechCorp')
  })

  test('includes companySector for hiring_company', ({ assert }) => {
    const { user } = buildCoverLetterPrompt({
      ...baseContext,
      companyType: 'hiring_company',
    })
    // ORACLE: hiring_company → sector is in prompt
    assert.include(user, 'SaaS')
  })
})

test.group('buildCoverLetterRefinementPrompt', () => {
  const baseContext: CoverLetterRefinementContext = {
    cvText: '5 years of experience in web development.',
    offerTitle: 'Senior Developer',
    offerDescription: 'Looking for 8+ years experience.',
    companyName: 'TechCorp',
    companySector: null,
    companySize: null,
    companyType: 'hiring_company',
    applicationAdvice: null,
    language: 'en',
    previousCoverLetter: 'Dear Hiring Manager, I am writing to apply...',
    userInstruction: 'Make it more concise and highlight leadership',
  }

  test('includes previous cover letter and user instruction', ({ assert }) => {
    const { user } = buildCoverLetterRefinementPrompt(baseContext)

    // ORACLE: refinement prompt includes both previous letter and instruction
    assert.include(user, 'Dear Hiring Manager')
    assert.include(user, 'Make it more concise and highlight leadership')
    assert.include(user, 'Previous Cover Letter')
  })
})

test.group('parseCoverLetterResponse', () => {
  test('returns trimmed text for plain text response', ({ assert }) => {
    // ORACLE: plain text → returned trimmed
    const raw = '  Dear Hiring Manager, I am writing to express my interest.  '
    const result = parseCoverLetterResponse(raw)

    assert.isNotNull(result)
    assert.equal(result, 'Dear Hiring Manager, I am writing to express my interest.')
  })

  test('strips markdown code fences', ({ assert }) => {
    // ORACLE: markdown fences stripped → clean text
    const raw = '```\nDear Hiring Manager,\nI am interested.\n```'
    const result = parseCoverLetterResponse(raw)

    assert.isNotNull(result)
    assert.equal(result, 'Dear Hiring Manager,\nI am interested.')
  })

  test('strips markdown code fences with language tag', ({ assert }) => {
    // ORACLE: markdown fences with language tag stripped
    const raw = '```text\nDear Hiring Manager,\nI am interested.\n```'
    const result = parseCoverLetterResponse(raw)

    assert.isNotNull(result)
    assert.equal(result, 'Dear Hiring Manager,\nI am interested.')
  })

  test('returns null for empty/whitespace response', ({ assert }) => {
    // ORACLE: empty input → null
    assert.isNull(parseCoverLetterResponse(''))
    assert.isNull(parseCoverLetterResponse('   '))
    assert.isNull(parseCoverLetterResponse('\n\n'))
  })

  test('truncates text exceeding MAX_COVER_LETTER_LENGTH', ({ assert }) => {
    // ORACLE: text longer than max → truncated to max length
    const longText = 'A'.repeat(MAX_COVER_LETTER_LENGTH + 500)
    const result = parseCoverLetterResponse(longText)

    assert.isNotNull(result)
    assert.equal(result!.length, MAX_COVER_LETTER_LENGTH)
  })
})
