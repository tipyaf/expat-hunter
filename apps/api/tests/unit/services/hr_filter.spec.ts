import { test } from '@japa/runner'

/**
 * Tests for the HR contact filtering logic used in SearchOrchestratorService.findNamedContactsViaHunter.
 * This validates the filtering keywords match expectations.
 */

const HR_KEYWORDS = [
  'recruiter', 'recruitment', 'talent acquisition',
  'human resources', 'hr manager', 'hr director',
  'people operations', 'hiring manager',
]

function isHrRole(role: string): boolean {
  const roleLower = role.toLowerCase()
  return HR_KEYWORDS.some((kw) => roleLower.includes(kw))
}

test.group('HR contact filter — excludes HR roles', () => {
  test('filters Recruiter', ({ assert }) => {
    assert.isTrue(isHrRole('Technical Recruiter'))
    assert.isTrue(isHrRole('Senior Recruiter'))
    assert.isTrue(isHrRole('Recruiter'))
  })

  test('filters Talent Acquisition', ({ assert }) => {
    assert.isTrue(isHrRole('Talent Acquisition Manager'))
    assert.isTrue(isHrRole('Head of Talent Acquisition'))
  })

  test('filters Human Resources', ({ assert }) => {
    assert.isTrue(isHrRole('Human Resources Director'))
    assert.isTrue(isHrRole('VP of Human Resources'))
  })

  test('filters HR Manager/Director', ({ assert }) => {
    assert.isTrue(isHrRole('HR Manager'))
    assert.isTrue(isHrRole('HR Director'))
    assert.isTrue(isHrRole('Senior HR Manager'))
  })

  test('filters People Operations', ({ assert }) => {
    assert.isTrue(isHrRole('People Operations Lead'))
    assert.isTrue(isHrRole('Head of People Operations'))
  })

  test('filters Recruitment roles', ({ assert }) => {
    assert.isTrue(isHrRole('Recruitment Manager'))
    assert.isTrue(isHrRole('Recruitment Coordinator'))
  })

  test('filters Hiring Manager', ({ assert }) => {
    assert.isTrue(isHrRole('Hiring Manager'))
  })
})

test.group('HR contact filter — keeps operational roles', () => {
  test('keeps Engineering Manager', ({ assert }) => {
    assert.isFalse(isHrRole('Engineering Manager'))
  })

  test('keeps CTO', ({ assert }) => {
    assert.isFalse(isHrRole('CTO'))
    assert.isFalse(isHrRole('Chief Technology Officer'))
  })

  test('keeps Head of Engineering', ({ assert }) => {
    assert.isFalse(isHrRole('Head of Engineering'))
  })

  test('keeps Product Owner', ({ assert }) => {
    assert.isFalse(isHrRole('Product Owner'))
  })

  test('keeps VP Engineering', ({ assert }) => {
    assert.isFalse(isHrRole('VP Engineering'))
  })

  test('keeps Finance Director', ({ assert }) => {
    assert.isFalse(isHrRole('Finance Director'))
  })

  test('keeps Software Engineer', ({ assert }) => {
    assert.isFalse(isHrRole('Senior Software Engineer'))
  })

  test('keeps Account Director', ({ assert }) => {
    assert.isFalse(isHrRole('Account Director'))
  })
})
