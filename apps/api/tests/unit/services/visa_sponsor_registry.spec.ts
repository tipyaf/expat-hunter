import { test } from '@japa/runner'
import VisaSponsorRegistryService from '#services/visa_sponsor_registry'

const service = new VisaSponsorRegistryService()

test.group('VisaSponsorRegistryService — normalizeCompanyName', () => {
  test('strips legal suffixes', ({ assert }) => {
    assert.equal(service.normalizeCompanyName('Datacom Limited'), 'datacom')
    assert.equal(service.normalizeCompanyName('XERO LTD'), 'xero')
    assert.equal(service.normalizeCompanyName('Pushpay Holdings'), 'pushpay')
    assert.equal(service.normalizeCompanyName('Vista Group International'), 'vista')
  })

  test('strips punctuation and extra whitespace', ({ assert }) => {
    assert.equal(service.normalizeCompanyName('Theta Systems (NZ)'), 'theta systems nz')
    assert.equal(service.normalizeCompanyName('  A & B  Corp  '), 'a b')
  })

  test('lowercases everything', ({ assert }) => {
    assert.equal(service.normalizeCompanyName('HALTER LIMITED'), 'halter')
  })

  test('handles empty string', ({ assert }) => {
    assert.equal(service.normalizeCompanyName(''), '')
  })
})

test.group('VisaSponsorRegistryService — fuzzyMatch', () => {
  test('exact match returns 1', ({ assert }) => {
    assert.equal(service.fuzzyMatch('datacom', 'datacom'), 1)
  })

  test('empty strings return 0 or 1', ({ assert }) => {
    assert.equal(service.fuzzyMatch('', ''), 1)
    assert.equal(service.fuzzyMatch('abc', ''), 0)
    assert.equal(service.fuzzyMatch('', 'abc'), 0)
  })

  test('substring containment scores >= 0.9', ({ assert }) => {
    // "datacom" is contained in "datacom connect"
    const score = service.fuzzyMatch('datacom', 'datacom connect')
    assert.isAtLeast(score, 0.9)
  })

  test('reverse substring containment scores >= 0.9', ({ assert }) => {
    // "datacom connect" contains "datacom"
    const score = service.fuzzyMatch('datacom connect', 'datacom')
    assert.isAtLeast(score, 0.9)
  })

  test('token overlap scores >= 0.85', ({ assert }) => {
    // "vista group" tokens are all in "vista group nz"
    const score = service.fuzzyMatch('vista group', 'vista group nz')
    assert.isAtLeast(score, 0.85)
  })

  test('completely different strings score low', ({ assert }) => {
    const score = service.fuzzyMatch('apple', 'microsoft')
    assert.isBelow(score, 0.5)
  })

  test('similar strings (levenshtein fallback) score reasonably', ({ assert }) => {
    // "theta" vs "thetaa" — 1 char difference
    const score = service.fuzzyMatch('theta', 'thetaa')
    assert.isAbove(score, 0.8)
  })

  test('POC cases: Datacom >= 0.9', ({ assert }) => {
    const normalized = service.normalizeCompanyName('Datacom')
    const registryName = service.normalizeCompanyName('DATACOM CONNECT LIMITED')
    const score = service.fuzzyMatch(normalized, registryName)
    assert.isAtLeast(score, 0.9)
  })

  test('POC cases: Vista Group >= 0.85', ({ assert }) => {
    const normalized = service.normalizeCompanyName('Vista Group')
    const registryName = service.normalizeCompanyName('VISTA GROUP (NZ) LIMITED')
    const score = service.fuzzyMatch(normalized, registryName)
    assert.isAtLeast(score, 0.85)
  })

  test('POC cases: Halter exact match via trading name', ({ assert }) => {
    const normalized = service.normalizeCompanyName('Halter')
    const registryName = service.normalizeCompanyName('Halter')
    assert.equal(service.fuzzyMatch(normalized, registryName), 1)
  })

  test('POC cases: Xero exact match', ({ assert }) => {
    const normalized = service.normalizeCompanyName('Xero')
    const registryName = service.normalizeCompanyName('XERO LIMITED')
    const score = service.fuzzyMatch(normalized, registryName)
    assert.equal(score, 1) // "xero" === "xero" after normalization
  })
})
