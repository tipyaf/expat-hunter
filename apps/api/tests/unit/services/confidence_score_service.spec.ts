import { test } from '@japa/runner'
import ConfidenceScoreService from '#services/confidence_score_service'

function makeContact(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    email: null,
    role: '',
    linkedinUrl: null,
    relevanceScore: null,
    relevanceLabel: null,
    $preloaded: {},
    ...overrides,
  } as any
}

function makeCompany(overrides: Record<string, unknown> = {}) {
  return {
    id: 'co1',
    website: null,
    sector: null,
    size: null,
    city: null,
    signals: null,
    ...overrides,
  } as any
}

test.group('ConfidenceScoreService', () => {
  const service = new ConfidenceScoreService()

  test('minimal contact without company scores low', async ({ assert }) => {
    const result = await service.calculate(makeContact())
    assert.isBelow(result.score, 20)
    assert.isAbove(result.factors.length, 0)
    const negatives = result.factors.filter((f) => f.impact === 'negative')
    assert.isAbove(negatives.length, 0)
  })

  test('contact with email scores higher than without', async ({ assert }) => {
    const withEmail = await service.calculate(makeContact({ email: 'a@b.com' }))
    const withoutEmail = await service.calculate(makeContact())
    assert.isAbove(withEmail.score, withoutEmail.score)
  })

  test('contact with all data and rich company scores high', async ({ assert }) => {
    const contact = makeContact({
      email: 'ceo@acme.com',
      role: 'Chief Executive Officer',
      linkedinUrl: 'https://linkedin.com/in/ceo',
      relevanceScore: 90,
      relevanceLabel: 'very_relevant',
    })
    const company = makeCompany({
      website: 'https://acme.com',
      sector: 'Technology',
      size: '50-200',
      city: 'Auckland',
      signals: { hiring: true },
    })

    const result = await service.calculate(contact, company)
    assert.isAbove(result.score, 85)
    const positives = result.factors.filter((f) => f.impact === 'positive')
    assert.isAbove(positives.length, 5)
  })

  test('very_relevant label gives bonus points', async ({ assert }) => {
    const base = {
      email: 'a@b.com',
      role: 'Manager',
      relevanceScore: 80,
    }
    const relevant = await service.calculate(makeContact({ ...base, relevanceLabel: 'relevant' }))
    const veryRelevant = await service.calculate(makeContact({ ...base, relevanceLabel: 'very_relevant' }))
    assert.isAbove(veryRelevant.score, relevant.score)
  })

  test('company data contributes to score', async ({ assert }) => {
    const contact = makeContact({ email: 'a@b.com', role: 'Dev Lead' })
    const withoutCompany = await service.calculate(contact)
    const withCompany = await service.calculate(contact, makeCompany({
      website: 'https://co.com',
      sector: 'Finance',
      city: 'Wellington',
    }))
    assert.isAbove(withCompany.score, withoutCompany.score)
  })

  test('calculateBatch returns results for all contacts', async ({ assert }) => {
    const contacts = [
      makeContact({ id: 'c1', email: 'a@b.com' }),
      makeContact({ id: 'c2' }),
      makeContact({ id: 'c3', role: 'CEO', email: 'ceo@x.com' }),
    ]
    const results = await service.calculateBatch(contacts)
    assert.equal(results.size, 3)
    assert.isTrue(results.has('c1'))
    assert.isTrue(results.has('c2'))
    assert.isTrue(results.has('c3'))
  })

  test('factors include correct impact types', async ({ assert }) => {
    const result = await service.calculate(
      makeContact({ email: 'a@b.com', role: 'Chief Technology Officer', linkedinUrl: null, relevanceScore: null }),
    )
    const labels = result.factors.map((f) => f.label)
    assert.include(labels, 'Email disponible')
    assert.include(labels, 'Poste identifié')
    // LinkedIn missing = neutral, not negative
    const linkedinFactor = result.factors.find((f) => f.label === 'Pas de profil LinkedIn')
    assert.equal(linkedinFactor?.impact, 'neutral')
  })

  test('score is always between 0 and 100', async ({ assert }) => {
    const scenarios = [
      makeContact(),
      makeContact({ email: 'a@b.com', role: 'CEO', linkedinUrl: 'https://li.com', relevanceScore: 95, relevanceLabel: 'very_relevant' }),
    ]
    for (const contact of scenarios) {
      const fullCompany = makeCompany({ website: 'https://x.com', sector: 'Tech', size: '100', city: 'NYC', signals: { hiring: true } })
      const result = await service.calculate(contact, fullCompany)
      assert.isAtLeast(result.score, 0)
      assert.isAtMost(result.score, 100)
    }
  })
})
