import { test } from '@japa/runner'
import {
  parseCvExtractionResponse,
  buildCvExtractionPrompt,
} from '../../../app/ai/prompts/cv_extraction_prompt.js'

test.group('buildCvExtractionPrompt', () => {
  test('should build system and user messages from CV text', ({ assert }) => {
    const prompt = buildCvExtractionPrompt('John Doe - Développeur Full-Stack')

    assert.properties(prompt, ['system', 'user'])
    assert.include(prompt.system, 'JSON')
    assert.include(prompt.user, 'John Doe')
  })

  test('should truncate CV text to 4000 chars', ({ assert }) => {
    const longText = 'a'.repeat(5000)
    const prompt = buildCvExtractionPrompt(longText)

    // user prompt should contain at most 4000 chars of CV text
    assert.isTrue(prompt.user.length < 5000)
  })
})

test.group('parseCvExtractionResponse', () => {
  test('should parse valid JSON response', ({ assert }) => {
    const raw = JSON.stringify({
      skills: ['TypeScript', 'React', 'Node.js'],
      suggestedRoles: ['Full-Stack Developer', 'Tech Lead'],
      suggestedSectors: ['Tech', 'SaaS'],
      experienceYears: 8,
      summary: 'Développeur expérimenté en technologies web modernes.',
    })

    const result = parseCvExtractionResponse(raw)

    assert.deepEqual(result.skills, ['TypeScript', 'React', 'Node.js'])
    assert.deepEqual(result.suggestedRoles, ['Full-Stack Developer', 'Tech Lead'])
    assert.deepEqual(result.suggestedSectors, ['Tech', 'SaaS'])
    assert.equal(result.experienceYears, 8)
    assert.include(result.summary, 'Développeur')
  })

  test('should handle markdown code fences', ({ assert }) => {
    const raw = `\`\`\`json
{
  "skills": ["Python"],
  "suggestedRoles": ["Data Engineer"],
  "suggestedSectors": ["Finance"],
  "experienceYears": 5,
  "summary": "Data engineer expérimenté."
}
\`\`\``

    const result = parseCvExtractionResponse(raw)

    assert.deepEqual(result.skills, ['Python'])
    assert.equal(result.experienceYears, 5)
  })

  test('should handle missing fields gracefully', ({ assert }) => {
    const raw = JSON.stringify({
      skills: ['Go'],
    })

    const result = parseCvExtractionResponse(raw)

    assert.deepEqual(result.skills, ['Go'])
    assert.deepEqual(result.suggestedRoles, [])
    assert.deepEqual(result.suggestedSectors, [])
    assert.isNull(result.experienceYears)
    assert.equal(result.summary, '')
  })

  test('should throw on invalid JSON', ({ assert }) => {
    assert.throws(() => {
      parseCvExtractionResponse('not json at all')
    })
  })
})
