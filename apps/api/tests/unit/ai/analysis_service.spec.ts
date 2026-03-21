import { test } from '@japa/runner'
import {
  buildRelevanceAnalysisPrompt,
  parseRelevanceAnalysisResponse,
  type RelevanceAnalysisResult,
} from '#ai/prompts/relevance_analysis_prompt'
import { RelevanceAnalyzer } from '#ai/relevance_analyzer'

test.group('AnalysisService — prompt & parsing integration', () => {
  test('buildRelevanceAnalysisPrompt includes all contact and candidate fields', ({ assert }) => {
    const prompt = buildRelevanceAnalysisPrompt(
      {
        fullName: 'Alice Martin',
        role: 'Engineering Manager',
        email: 'alice@techcorp.nz',
        linkedinUrl: 'https://linkedin.com/in/alice',
        companyName: 'TechCorp',
        companySector: 'technology',
        companyCity: 'Wellington',
        companyCountry: 'NZ',
        companyWebsite: 'https://techcorp.nz',
        companySize: '50-200',
      },
      {
        skills: ['TypeScript', 'Node.js', 'React'],
        experienceYears: 8,
        targetCountries: ['NZ', 'AU'],
        targetSectors: ['technology'],
        targetRoles: ['Senior Developer', 'Tech Lead'],
        cvSummary: 'Full-stack developer with 8 years experience',
      }
    )

    assert.include(prompt.user, 'Alice Martin')
    assert.include(prompt.user, 'Engineering Manager')
    assert.include(prompt.user, 'TechCorp')
    assert.include(prompt.user, 'Wellington')
    assert.include(prompt.user, 'TypeScript')
    assert.include(prompt.user, '8 ans')
    assert.include(prompt.user, 'Full-stack developer')
    assert.include(prompt.system, 'score')
    assert.include(prompt.system, 'JSON')
  })

  test('parseRelevanceAnalysisResponse handles very_relevant contact correctly', ({
    assert,
  }) => {
    const raw = JSON.stringify({
      score: 90,
      label: 'very_relevant',
      reason: 'Engineering Manager dans une boîte tech en NZ, match parfait avec le profil.',
      recommendation: 'contact',
    })

    const result = parseRelevanceAnalysisResponse(raw)

    assert.equal(result.score, 90)
    assert.equal(result.label, 'very_relevant')
    assert.equal(result.recommendation, 'contact')
    assert.include(result.reason, 'Engineering Manager')
  })

  test('parseRelevanceAnalysisResponse handles not_relevant contact', ({ assert }) => {
    const raw = JSON.stringify({
      score: 15,
      label: 'not_relevant',
      reason: 'Aucun lien avec le secteur tech, entreprise dans la restauration.',
      recommendation: 'skip',
    })

    const result = parseRelevanceAnalysisResponse(raw)

    assert.equal(result.score, 15)
    assert.equal(result.label, 'not_relevant')
    assert.equal(result.recommendation, 'skip')
  })

  test('parseRelevanceAnalysisResponse handles to_review contact', ({ assert }) => {
    const raw = JSON.stringify({
      score: 42,
      label: 'to_review',
      reason: 'Secteur connexe, rôle pas directement tech mais potentiel.',
      recommendation: 'manual_review',
    })

    const result = parseRelevanceAnalysisResponse(raw)

    assert.equal(result.score, 42)
    assert.equal(result.label, 'to_review')
    assert.equal(result.recommendation, 'manual_review')
  })

  test('parseRelevanceAnalysisResponse derives correct label when score and label mismatch', ({
    assert,
  }) => {
    // LLM might return inconsistent score/label — we trust the label if valid
    const raw = JSON.stringify({
      score: 85,
      label: 'relevant', // Should be very_relevant based on score, but label is valid
      reason: 'Test',
      recommendation: 'contact',
    })

    const result = parseRelevanceAnalysisResponse(raw)

    // We accept the valid label even if it doesn't match the score
    assert.equal(result.score, 85)
    assert.equal(result.label, 'relevant')
  })

  test('RelevanceAnalyzer.isConfigured returns false in test environment', ({ assert }) => {
    const analyzer = new RelevanceAnalyzer()
    assert.isFalse(analyzer.isConfigured)
  })
})
