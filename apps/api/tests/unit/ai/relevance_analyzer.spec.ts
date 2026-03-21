import { test } from '@japa/runner'
import { RelevanceAnalyzer } from '#ai/relevance_analyzer'
import type { CandidateForAnalysis, ContactForAnalysis } from '#ai/prompts/relevance_analysis_prompt'

const mockContact: ContactForAnalysis = {
  fullName: 'John Smith',
  role: 'CTO',
  email: 'john@acme.co.nz',
  linkedinUrl: null,
  companyName: 'Acme Tech',
  companySector: 'technology',
  companyCity: 'Auckland',
  companyCountry: 'NZ',
  companyWebsite: null,
  companySize: null,
}

const mockCandidate: CandidateForAnalysis = {
  skills: ['TypeScript', 'React'],
  experienceYears: 10,
  targetCountries: ['NZ'],
  targetSectors: ['technology'],
  targetRoles: ['Senior Developer'],
  cvSummary: null,
}

test.group('RelevanceAnalyzer', () => {
  test('isConfigured returns false when OPENROUTER_API_KEY is empty', ({ assert }) => {
    const analyzer = new RelevanceAnalyzer()
    // In test env, OPENROUTER_API_KEY is not set
    assert.isFalse(analyzer.isConfigured)
  })
})
