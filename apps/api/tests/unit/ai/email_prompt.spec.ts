import { test } from '@japa/runner'
import {
  buildEmailPrompt,
  parseEmailResponse,
  type CandidateForEmail,
  type ContactForEmail,
} from '#ai/prompts/email_prompt'

const mockContact: ContactForEmail = {
  fullName: 'John Smith',
  role: 'CTO',
  companyName: 'Acme Tech',
  companySector: 'technology',
  companyCountry: 'NZ',
  companyCity: 'Auckland',
}

const mockCandidate: CandidateForEmail = {
  fullName: 'Yannick Benchimol',
  skills: ['TypeScript', 'React', 'Node.js'],
  experienceYears: 10,
  targetRoles: ['Senior Developer', 'Tech Lead'],
  cvSummary: 'Experienced full-stack developer',
}

test.group('buildEmailPrompt', () => {
  test('returns system and user prompts for initial email', ({ assert }) => {
    const prompt = buildEmailPrompt(mockContact, mockCandidate)

    assert.isString(prompt.system)
    assert.isString(prompt.user)
    assert.include(prompt.system, 'JSON')
    assert.include(prompt.system, 'ANGLAIS')
    assert.include(prompt.user, 'John Smith')
    assert.include(prompt.user, 'CTO')
    assert.include(prompt.user, 'Acme Tech')
    assert.include(prompt.user, 'Yannick Benchimol')
    assert.include(prompt.user, 'TypeScript')
    assert.include(prompt.user, 'premier email')
  })

  test('includes follow-up context when type is follow_up_1', ({ assert }) => {
    const prompt = buildEmailPrompt(mockContact, mockCandidate, {
      type: 'follow_up_1',
      previousEmail: 'Hi John, I wanted to reach out...',
    })

    assert.include(prompt.system, 'RELANCE')
    assert.include(prompt.user, 'Hi John, I wanted to reach out...')
    assert.include(prompt.user, 'relance')
  })

  test('handles missing optional fields', ({ assert }) => {
    const sparseContact: ContactForEmail = {
      fullName: 'Jane Doe',
      role: 'Manager',
      companyName: 'Unknown Corp',
      companySector: null,
      companyCountry: 'US',
      companyCity: null,
    }

    const prompt = buildEmailPrompt(sparseContact, { ...mockCandidate, cvSummary: null })
    assert.include(prompt.user, 'Non renseigné')
  })
})

test.group('parseEmailResponse', () => {
  test('parses valid JSON response', ({ assert }) => {
    const raw = JSON.stringify({
      subject: 'Quick question about your team',
      body: 'Hi John, I noticed Acme Tech is growing...',
    })

    const result = parseEmailResponse(raw)
    assert.equal(result.subject, 'Quick question about your team')
    assert.include(result.body, 'Acme Tech')
  })

  test('parses response wrapped in markdown fences', ({ assert }) => {
    const raw = '```json\n{"subject": "Hello!", "body": "Test body"}\n```'
    const result = parseEmailResponse(raw)
    assert.equal(result.subject, 'Hello!')
    assert.equal(result.body, 'Test body')
  })

  test('handles response with extra text around JSON', ({ assert }) => {
    const raw = 'Here is the email:\n{"subject": "Reaching out", "body": "Hi there"}\nDone!'
    const result = parseEmailResponse(raw)
    assert.equal(result.subject, 'Reaching out')
  })

  test('throws on completely invalid response', ({ assert }) => {
    assert.throws(() => {
      parseEmailResponse('This is not JSON at all')
    })
  })

  test('provides fallback subject when missing', ({ assert }) => {
    const raw = JSON.stringify({ body: 'Test body' })
    const result = parseEmailResponse(raw)
    assert.equal(result.subject, 'Reaching out')
  })
})
