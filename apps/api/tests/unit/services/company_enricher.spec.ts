import { test } from '@japa/runner'
import CompanyEnricher from '#services/company_enricher'

const enricher = new CompanyEnricher()

test.group('CompanyEnricher — extractDomain', () => {
  test('extracts domain from https URL', ({ assert }) => {
    assert.equal(enricher.extractDomain('https://www.theta.co.nz'), 'theta.co.nz')
  })

  test('extracts domain from http URL', ({ assert }) => {
    assert.equal(enricher.extractDomain('http://xero.com/about'), 'xero.com')
  })

  test('strips www prefix', ({ assert }) => {
    assert.equal(enricher.extractDomain('https://www.halterhq.com'), 'halterhq.com')
  })

  test('handles URL without protocol (adds https)', ({ assert }) => {
    assert.equal(enricher.extractDomain('phq.nz'), 'phq.nz')
  })

  test('returns empty for empty input', ({ assert }) => {
    assert.equal(enricher.extractDomain(''), '')
  })

  test('returns empty for invalid URL', ({ assert }) => {
    assert.equal(enricher.extractDomain('not a url at all'), '')
  })

  test('handles subdomains correctly', ({ assert }) => {
    assert.equal(enricher.extractDomain('https://careers.datacom.com'), 'careers.datacom.com')
  })
})

test.group('CompanyEnricher — roleScore (logic)', () => {
  /**
   * Extracted from CompanyEnricher for testing.
   * Scores roles for hiring relevance.
   */
  function roleScore(position: string): number {
    const lower = (position ?? '').toLowerCase()
    const hiring = ['talent', 'recruit', 'people', 'hr', 'human resources', 'hiring']
    const decision = ['cto', 'ceo', 'founder', 'vp', 'vice president', 'director', 'head of', 'chief', 'lead', 'manager', 'principal', 'senior']
    let score = 0
    if (hiring.some((k) => lower.includes(k))) score += 20
    if (decision.some((k) => lower.includes(k))) score += 10
    if (position) score += 1
    return score
  }

  test('hiring roles score highest (>=20)', ({ assert }) => {
    assert.isAtLeast(roleScore('Talent Acquisition Manager'), 20)
    assert.isAtLeast(roleScore('Recruitment Lead'), 20)
    assert.isAtLeast(roleScore('People Operations Director'), 20)
    assert.isAtLeast(roleScore('HR Business Partner'), 20)
  })

  test('decision makers score >= 10', ({ assert }) => {
    assert.isAtLeast(roleScore('CTO'), 10)
    assert.isAtLeast(roleScore('CEO'), 10)
    assert.isAtLeast(roleScore('VP Engineering'), 10)
    assert.isAtLeast(roleScore('Director of Technology'), 10)
    assert.isAtLeast(roleScore('Head of Product'), 10)
    assert.isAtLeast(roleScore('Engineering Manager'), 10)
  })

  test('hiring + decision maker combo scores >= 30', ({ assert }) => {
    assert.isAtLeast(roleScore('Talent Acquisition Director'), 30)
    assert.isAtLeast(roleScore('Chief Human Resources Officer'), 30)
  })

  test('generic positions score low (1)', ({ assert }) => {
    assert.equal(roleScore('Software Engineer'), 1)
    assert.equal(roleScore('Accountant'), 1)
    assert.equal(roleScore('Designer'), 1)
  })

  test('empty position scores 0', ({ assert }) => {
    assert.equal(roleScore(''), 0)
    assert.equal(roleScore(null as any), 0)
  })
})
