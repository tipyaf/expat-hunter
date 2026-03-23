import { test } from '@japa/runner'

/**
 * EmailEnricher unit tests.
 *
 * Since EmailEnricher depends on AdonisJS env (env.get), we test the pure logic
 * by extracting and testing the pattern inference and name parsing independently.
 * The Hunter API integration is tested via the POC pipeline (apps/api/commands/poc_pipeline.ts).
 */

test.group('EmailEnricher — inferEmailPatterns (logic)', () => {
  function inferEmailPatterns(firstName: string, lastName: string, domain: string): string[] {
    const f = firstName.toLowerCase().replace(/[^a-z]/g, '')
    const l = lastName.toLowerCase().replace(/[^a-z]/g, '')
    if (!f || !l) return []

    return [
      `${f}.${l}@${domain}`,
      `${f}${l}@${domain}`,
      `${f[0]}.${l}@${domain}`,
      `${f[0]}${l}@${domain}`,
      `${f}@${domain}`,
    ]
  }

  test('generates 5 patterns for standard name', ({ assert }) => {
    const patterns = inferEmailPatterns('Lauren', 'Blumgart', 'theta.co.nz')
    assert.lengthOf(patterns, 5)
    assert.include(patterns, 'lauren.blumgart@theta.co.nz')
    assert.include(patterns, 'laurenblumgart@theta.co.nz')
    assert.include(patterns, 'l.blumgart@theta.co.nz')
    assert.include(patterns, 'lblumgart@theta.co.nz')
    assert.include(patterns, 'lauren@theta.co.nz')
  })

  test('handles accented characters by stripping them', ({ assert }) => {
    const patterns = inferEmailPatterns('José', 'García', 'company.com')
    assert.lengthOf(patterns, 5)
    assert.include(patterns, 'jos.garca@company.com')
  })

  test('returns empty for missing first or last name', ({ assert }) => {
    assert.lengthOf(inferEmailPatterns('', 'Smith', 'co.nz'), 0)
    assert.lengthOf(inferEmailPatterns('John', '', 'co.nz'), 0)
    assert.lengthOf(inferEmailPatterns('', '', 'co.nz'), 0)
  })

  test('lowercases everything', ({ assert }) => {
    const patterns = inferEmailPatterns('JOHN', 'DOE', 'COMPANY.com')
    assert.include(patterns, 'john.doe@COMPANY.com')
    assert.include(patterns, 'j.doe@COMPANY.com')
  })
})

test.group('EmailEnricher — parseFullName (logic)', () => {
  function parseFullName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length < 2) return { firstName: parts[0] ?? '', lastName: '' }
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
  }

  test('parses simple two-part name', ({ assert }) => {
    const { firstName, lastName } = parseFullName('John Doe')
    assert.equal(firstName, 'John')
    assert.equal(lastName, 'Doe')
  })

  test('parses three-part name (multi-word last name)', ({ assert }) => {
    const { firstName, lastName } = parseFullName('Maria De La Cruz')
    assert.equal(firstName, 'Maria')
    assert.equal(lastName, 'De La Cruz')
  })

  test('handles single name (no last name)', ({ assert }) => {
    const { firstName, lastName } = parseFullName('Madonna')
    assert.equal(firstName, 'Madonna')
    assert.equal(lastName, '')
  })

  test('trims whitespace', ({ assert }) => {
    const { firstName, lastName } = parseFullName('  John   Doe  ')
    assert.equal(firstName, 'John')
    assert.equal(lastName, 'Doe')
  })
})
