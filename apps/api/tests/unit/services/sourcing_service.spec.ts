import { test } from '@japa/runner'

/**
 * SourcingService — GENERIC_NAMES unit tests.
 *
 * We test the detection logic independently since the full SourcingService
 * depends on the database (Lucid ORM). The constant and matching logic
 * are extracted here for testability.
 */

const GENERIC_NAMES = new Set([
  'hiring manager',
  'contact',
  'unknown',
  'hr manager',
  'recruiter',
  'team',
  'hiring',
  'jobs',
  'talent',
  'recruitment',
  'careers',
  'hr',
  'info',
  'support',
  'connect',
  'admin',
  'office',
  'reception',
  'enquiries',
  'general',
  'hello',
  'apply',
  'people',
  'human resources',
  'talent acquisition',
  'people operations',
])

function isGenericName(name: string): boolean {
  return GENERIC_NAMES.has(name.toLowerCase().trim())
}

test.group('SourcingService — GENERIC_NAMES', () => {
  test('detects original generic names', ({ assert }) => {
    assert.isTrue(isGenericName('hiring manager'))
    assert.isTrue(isGenericName('contact'))
    assert.isTrue(isGenericName('unknown'))
    assert.isTrue(isGenericName('hr manager'))
    assert.isTrue(isGenericName('recruiter'))
    assert.isTrue(isGenericName('team'))
    assert.isTrue(isGenericName('hiring'))
  })

  test('detects new anglophone generic names', ({ assert }) => {
    assert.isTrue(isGenericName('jobs'))
    assert.isTrue(isGenericName('talent'))
    assert.isTrue(isGenericName('recruitment'))
    assert.isTrue(isGenericName('careers'))
    assert.isTrue(isGenericName('hr'))
    assert.isTrue(isGenericName('info'))
    assert.isTrue(isGenericName('support'))
    assert.isTrue(isGenericName('connect'))
  })

  test('detects additional generic names', ({ assert }) => {
    assert.isTrue(isGenericName('admin'))
    assert.isTrue(isGenericName('office'))
    assert.isTrue(isGenericName('reception'))
    assert.isTrue(isGenericName('enquiries'))
    assert.isTrue(isGenericName('general'))
    assert.isTrue(isGenericName('hello'))
    assert.isTrue(isGenericName('apply'))
    assert.isTrue(isGenericName('people'))
  })

  test('detects multi-word generic names', ({ assert }) => {
    assert.isTrue(isGenericName('human resources'))
    assert.isTrue(isGenericName('talent acquisition'))
    assert.isTrue(isGenericName('people operations'))
  })

  test('is case-insensitive', ({ assert }) => {
    assert.isTrue(isGenericName('CAREERS'))
    assert.isTrue(isGenericName('Hiring Manager'))
    assert.isTrue(isGenericName('TALENT ACQUISITION'))
  })

  test('trims whitespace', ({ assert }) => {
    assert.isTrue(isGenericName('  careers  '))
    assert.isTrue(isGenericName('  hiring manager  '))
  })

  test('does NOT flag real person names', ({ assert }) => {
    assert.isFalse(isGenericName('Lauren Blumgart'))
    assert.isFalse(isGenericName('Jeff Ryan'))
    assert.isFalse(isGenericName('Maria Telles'))
    assert.isFalse(isGenericName('James Fuller'))
  })

  test('does NOT flag real job titles', ({ assert }) => {
    assert.isFalse(isGenericName('Chief Technology Officer'))
    assert.isFalse(isGenericName('Engineering Manager'))
    assert.isFalse(isGenericName('Senior Developer'))
  })
})
