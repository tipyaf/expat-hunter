import { test } from '@japa/runner'
import {
  buildRelevanceAnalysisPrompt,
  parseRelevanceAnalysisResponse,
  type CandidateForAnalysis,
  type ContactForAnalysis,
} from '#ai/prompts/relevance_analysis_prompt'

const mockContact: ContactForAnalysis = {
  fullName: 'John Smith',
  role: 'CTO',
  email: 'john@acme.co.nz',
  linkedinUrl: 'https://linkedin.com/in/johnsmith',
  companyName: 'Acme Tech',
  companySector: 'technology',
  companyCity: 'Auckland',
  companyCountry: 'NZ',
  companyWebsite: 'https://acme.co.nz',
  companySize: '50-200',
}

const mockCandidate: CandidateForAnalysis = {
  skills: ['TypeScript', 'React', 'Node.js'],
  experienceYears: 10,
  targetCountries: ['NZ', 'AU'],
  targetSectors: ['technology', 'fintech'],
  targetRoles: ['Senior Developer', 'Tech Lead'],
  cvSummary: 'Experienced full-stack developer',
}

test.group('buildRelevanceAnalysisPrompt', () => {
  test('returns system and user prompts', ({ assert }) => {
    const prompt = buildRelevanceAnalysisPrompt(mockContact, mockCandidate)

    assert.isString(prompt.system)
    assert.isString(prompt.user)
    assert.include(prompt.system, 'JSON')
    assert.include(prompt.user, 'John Smith')
    assert.include(prompt.user, 'CTO')
    assert.include(prompt.user, 'Acme Tech')
    assert.include(prompt.user, 'TypeScript')
    assert.include(prompt.user, 'NZ')
  })

  test('includes candidate CV summary when provided', ({ assert }) => {
    const prompt = buildRelevanceAnalysisPrompt(mockContact, mockCandidate)
    assert.include(prompt.user, 'Experienced full-stack developer')
  })

  test('handles missing optional fields gracefully', ({ assert }) => {
    const sparseContact: ContactForAnalysis = {
      fullName: 'Jane Doe',
      role: 'Manager',
      email: null,
      linkedinUrl: null,
      companyName: 'Unknown Corp',
      companySector: null,
      companyCity: null,
      companyCountry: 'US',
      companyWebsite: null,
      companySize: null,
    }

    const prompt = buildRelevanceAnalysisPrompt(sparseContact, {
      ...mockCandidate,
      cvSummary: null,
    })

    assert.include(prompt.user, 'Non disponible')
    assert.include(prompt.user, 'Non renseigné')
  })
})

test.group('parseRelevanceAnalysisResponse', () => {
  test('parses valid JSON response', ({ assert }) => {
    const raw = JSON.stringify({
      score: 85,
      label: 'very_relevant',
      reason: 'CTO dans une entreprise tech en NZ, match parfait.',
      recommendation: 'contact',
    })

    const result = parseRelevanceAnalysisResponse(raw)

    assert.equal(result.score, 85)
    assert.equal(result.label, 'very_relevant')
    assert.include(result.reason, 'CTO')
    assert.equal(result.recommendation, 'contact')
  })

  test('parses response wrapped in markdown code fences', ({ assert }) => {
    const raw = '```json\n{"score": 60, "label": "relevant", "reason": "Bon match", "recommendation": "contact"}\n```'

    const result = parseRelevanceAnalysisResponse(raw)

    assert.equal(result.score, 60)
    assert.equal(result.label, 'relevant')
  })

  test('clamps score to 0-100 range', ({ assert }) => {
    const result = parseRelevanceAnalysisResponse(
      JSON.stringify({ score: 150, label: 'very_relevant', reason: 'Test', recommendation: 'contact' })
    )
    assert.equal(result.score, 100)

    const result2 = parseRelevanceAnalysisResponse(
      JSON.stringify({ score: -10, label: 'not_relevant', reason: 'Test', recommendation: 'skip' })
    )
    assert.equal(result2.score, 0)
  })

  test('derives label from score when invalid label provided', ({ assert }) => {
    const result = parseRelevanceAnalysisResponse(
      JSON.stringify({ score: 80, label: 'invalid_label', reason: 'Test', recommendation: 'contact' })
    )
    assert.equal(result.label, 'very_relevant')
  })

  test('derives recommendation when invalid recommendation provided', ({ assert }) => {
    const result = parseRelevanceAnalysisResponse(
      JSON.stringify({ score: 40, label: 'to_review', reason: 'Test', recommendation: 'invalid' })
    )
    assert.equal(result.recommendation, 'manual_review')
  })

  test('handles response with extra text around JSON', ({ assert }) => {
    const raw = 'Here is my analysis:\n{"score": 55, "label": "relevant", "reason": "Bon match", "recommendation": "contact"}\nHope this helps!'

    const result = parseRelevanceAnalysisResponse(raw)
    assert.equal(result.score, 55)
  })

  test('throws on completely invalid response', ({ assert }) => {
    assert.throws(() => {
      parseRelevanceAnalysisResponse('This is not JSON at all')
    })
  })
})
