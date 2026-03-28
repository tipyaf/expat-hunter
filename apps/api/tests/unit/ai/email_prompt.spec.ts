import { test } from '@japa/runner'
import {
  buildEmailPrompt,
  parseEmailResponse,
  type CandidateForEmail,
  type ContactForEmail,
  type EmailTemplatePattern,
  type PresetPromptOptions,
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

test.group('buildEmailPrompt — template injection', () => {
  test('injects template patterns into user prompt', ({ assert }) => {
    const template: EmailTemplatePattern = {
      subjectPattern: 'Re: {{company}} opportunity',
      bodyPattern: 'Hi {{name}}, I saw {{company}} is hiring for {{role}}...',
    }

    const prompt = buildEmailPrompt(mockContact, mockCandidate, { template })

    assert.include(prompt.user, 'Re: {{company}} opportunity')
    assert.include(prompt.user, 'Hi {{name}}, I saw {{company}} is hiring for {{role}}...')
    assert.include(prompt.user, 'Template à personnaliser')
  })

  test('changes final instruction to personalize template', ({ assert }) => {
    const template: EmailTemplatePattern = {
      subjectPattern: 'Subject pattern',
      bodyPattern: 'Body pattern',
    }

    const prompt = buildEmailPrompt(mockContact, mockCandidate, { template })

    assert.include(prompt.user, 'Personnalise le template')
    assert.notInclude(prompt.user, 'premier email')
  })

  test('does not inject template section when no template provided', ({ assert }) => {
    const prompt = buildEmailPrompt(mockContact, mockCandidate)

    assert.notInclude(prompt.user, 'Template à personnaliser')
  })
})

test.group('buildEmailPrompt — preset injection', () => {
  test('applies tone override to system prompt', ({ assert }) => {
    const preset: PresetPromptOptions = { tone: 'friendly' }

    const prompt = buildEmailPrompt(mockContact, mockCandidate, { preset })

    assert.include(prompt.system, 'amical')
  })

  test('applies length constraint to system prompt', ({ assert }) => {
    const preset: PresetPromptOptions = { length: 'short' }

    const prompt = buildEmailPrompt(mockContact, mockCandidate, { preset })

    assert.include(prompt.system, '80 mots maximum')
  })

  test('applies medium length by default', ({ assert }) => {
    const prompt = buildEmailPrompt(mockContact, mockCandidate)

    assert.include(prompt.system, '150 mots maximum')
  })

  test('applies framework instruction to system prompt', ({ assert }) => {
    const preset: PresetPromptOptions = { framework: 'aida' }

    const prompt = buildEmailPrompt(mockContact, mockCandidate, { preset })

    assert.include(prompt.system, 'AIDA')
    assert.include(prompt.system, 'Attention')
  })

  test('switches language to French when preset specifies fr', ({ assert }) => {
    const preset: PresetPromptOptions = { language: 'fr' }

    const prompt = buildEmailPrompt(mockContact, mockCandidate, { preset })

    assert.include(prompt.system, 'FRANÇAIS')
    assert.notInclude(prompt.system, 'ANGLAIS')
  })

  test('includes custom instructions in system prompt', ({ assert }) => {
    const preset: PresetPromptOptions = {
      customInstructions: 'Mention remote work availability',
    }

    const prompt = buildEmailPrompt(mockContact, mockCandidate, { preset })

    assert.include(prompt.system, 'Mention remote work availability')
  })

  test('applies default professional tone when no tone specified', ({ assert }) => {
    const prompt = buildEmailPrompt(mockContact, mockCandidate)

    assert.include(prompt.system, 'professionnel mais chaleureux')
  })
})

test.group('buildEmailPrompt — combined options', () => {
  test('applies template + preset + instructions together', ({ assert }) => {
    const template: EmailTemplatePattern = {
      subjectPattern: 'About {{role}}',
      bodyPattern: 'Hello {{name}}...',
    }
    const preset: PresetPromptOptions = {
      tone: 'direct',
      length: 'long',
      framework: 'pas',
      language: 'fr',
    }

    const prompt = buildEmailPrompt(mockContact, mockCandidate, {
      template,
      preset,
      instructions: 'Focus on leadership experience',
    })

    // Template in user prompt
    assert.include(prompt.user, 'About {{role}}')
    assert.include(prompt.user, 'Hello {{name}}...')
    // Preset in system prompt
    assert.include(prompt.system, 'direct')
    assert.include(prompt.system, '250 mots maximum')
    assert.include(prompt.system, 'PAS')
    assert.include(prompt.system, 'FRANÇAIS')
    // Instructions in user prompt
    assert.include(prompt.user, 'Focus on leadership experience')
  })

  test('instructions change final instruction text', ({ assert }) => {
    const prompt = buildEmailPrompt(mockContact, mockCandidate, {
      instructions: 'Make it shorter',
    })

    assert.include(prompt.user, 'Make it shorter')
    assert.include(prompt.user, "Améliore l'email")
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
