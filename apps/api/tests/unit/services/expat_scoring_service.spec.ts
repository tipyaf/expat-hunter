import { test } from '@japa/runner'
import ExpatScoringService from '#services/expat_scoring_service'

function makeContact(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    companyId: 'co1',
    email: null,
    role: '',
    linkedinUrl: null,
    relevanceScore: null,
    relevanceLabel: null,
    emailSource: null,
    $preloaded: {},
    ...overrides,
  } as any
}

function makeCompany(overrides: Record<string, unknown> = {}) {
  return {
    id: 'co1',
    name: null,
    country: null,
    website: null,
    sector: null,
    size: null,
    city: null,
    signals: null,
    visaSponsorStatus: null,
    visaSponsorCountries: null,
    hiringIntensity: null,
    teamCrawledAt: null,
    ...overrides,
  } as any
}

test.group('ExpatScoringService — scoreVisa', () => {
  const service = new ExpatScoringService()

  test('no company returns score 0 / 25', async ({ assert }) => {
    // scoreVisa is private, so test via calculate with no company
    const result = await service.calculate(makeContact(), null)
    // ORACLE: visa.score = 0 (no company data)
    assert.equal(result.breakdown.visa.score, 0)
    assert.equal(result.breakdown.visa.maxScore, 25)
  })

  test('accredited company returns score 25 / 25', async ({ assert }) => {
    const company = makeCompany({
      visaSponsorStatus: 'accredited',
      visaSponsorCountries: ['NZ', 'AU'],
    })
    const result = await service.calculate(makeContact(), company)
    // ORACLE: visa.score = 25 (accredited sponsor)
    assert.equal(result.breakdown.visa.score, 25)
    assert.equal(result.breakdown.visa.maxScore, 25)
  })

  test('not_found company returns score 5 / 25', async ({ assert }) => {
    const company = makeCompany({ visaSponsorStatus: 'not_found' })
    const result = await service.calculate(makeContact(), company)
    // ORACLE: visa.score = 5 (not found in registry)
    assert.equal(result.breakdown.visa.score, 5)
  })

  test('unknown status without name returns score 8 / 25', async ({ assert }) => {
    const company = makeCompany({ visaSponsorStatus: null, name: null })
    const result = await service.calculate(makeContact(), company)
    // ORACLE: visa.score = 8 (unknown status, no name/country for live check)
    assert.equal(result.breakdown.visa.score, 8)
  })
})

test.group('ExpatScoringService — scoreRole', () => {
  const service = new ExpatScoringService()

  test('empty role returns score 0 / 30', async ({ assert }) => {
    const result = await service.calculate(makeContact({ role: '' }), null)
    // ORACLE: role.score = 0 (no role identified)
    assert.equal(result.breakdown.role.score, 0)
    assert.equal(result.breakdown.role.maxScore, 30)
  })

  test('short role (< 3 chars) returns score 0', async ({ assert }) => {
    const result = await service.calculate(makeContact({ role: 'ab' }), null)
    // ORACLE: role.score = 0 (role.length < 3)
    assert.equal(result.breakdown.role.score, 0)
  })

  test('role with AI relevanceScore normalizes to 30-point scale', async ({ assert }) => {
    const result = await service.calculate(
      makeContact({ role: 'Software Engineer', relevanceScore: 50, relevanceLabel: 'relevant' }),
      null
    )
    // ORACLE: normalized = Math.round((50 / 100) * 30) = Math.round(15) = 15
    assert.equal(result.breakdown.role.score, 15)
  })

  test('very_relevant label with score 90 normalizes correctly', async ({ assert }) => {
    const result = await service.calculate(
      makeContact({ role: 'CTO', relevanceScore: 90, relevanceLabel: 'very_relevant' }),
      null
    )
    // ORACLE: normalized = Math.round((90 / 100) * 30) = Math.round(27) = 27
    assert.equal(result.breakdown.role.score, 27)
  })

  test('senior keyword without AI score returns 22', async ({ assert }) => {
    const result = await service.calculate(
      makeContact({ role: 'Head of Engineering', relevanceScore: null }),
      null
    )
    // ORACLE: role.score = 22 (senior keyword "head of" matched)
    assert.equal(result.breakdown.role.score, 22)
  })

  test('mid-level keyword without AI score returns 15', async ({ assert }) => {
    const result = await service.calculate(
      makeContact({ role: 'Software Developer', relevanceScore: null }),
      null
    )
    // ORACLE: role.score = 15 (mid keyword "developer" matched)
    assert.equal(result.breakdown.role.score, 15)
  })

  test('unknown role without AI score returns 8', async ({ assert }) => {
    const result = await service.calculate(
      makeContact({ role: 'Office Coordinator', relevanceScore: null }),
      null
    )
    // ORACLE: role.score = 8 (role identified but no keyword match)
    assert.equal(result.breakdown.role.score, 8)
  })
})

test.group('ExpatScoringService — scoreHiring', () => {
  const service = new ExpatScoringService()

  test('no company returns score 0 / 20', async ({ assert }) => {
    const result = await service.calculate(makeContact(), null)
    // ORACLE: hiring.score = 0 (no company)
    assert.equal(result.breakdown.hiring.score, 0)
    assert.equal(result.breakdown.hiring.maxScore, 20)
  })

  test('hiringIntensity >= 5 returns score 20', async ({ assert }) => {
    const company = makeCompany({ hiringIntensity: 7 })
    const result = await service.calculate(makeContact(), company)
    // ORACLE: hiring.score = 20 (intensity 7 >= 5)
    assert.equal(result.breakdown.hiring.score, 20)
  })

  test('hiringIntensity = 3 returns score 12', async ({ assert }) => {
    const company = makeCompany({ hiringIntensity: 3 })
    const result = await service.calculate(makeContact(), company)
    // ORACLE: hiring.score = 12 (intensity 3 >= 2 and < 5)
    assert.equal(result.breakdown.hiring.score, 12)
  })

  test('hiringIntensity = 1 returns score 6', async ({ assert }) => {
    const company = makeCompany({ hiringIntensity: 1 })
    const result = await service.calculate(makeContact(), company)
    // ORACLE: hiring.score = 6 (intensity === 1)
    assert.equal(result.breakdown.hiring.score, 6)
  })

  test('hiringIntensity = 0 with website returns score 5', async ({ assert }) => {
    const company = makeCompany({ hiringIntensity: 0, website: 'https://example.com' })
    const result = await service.calculate(makeContact(), company)
    // ORACLE: hiring.score = 5 (intensity 0, has website)
    assert.equal(result.breakdown.hiring.score, 5)
  })

  test('hiringIntensity = 0 without website returns score 0', async ({ assert }) => {
    const company = makeCompany({ hiringIntensity: 0, website: null })
    const result = await service.calculate(makeContact(), company)
    // ORACLE: hiring.score = 0 (intensity 0, no website)
    assert.equal(result.breakdown.hiring.score, 0)
  })
})

test.group('ExpatScoringService — scoreExpatFriendly', () => {
  const service = new ExpatScoringService()

  test('no signals returns score 0 / 15', async ({ assert }) => {
    const result = await service.calculate(makeContact(), makeCompany())
    // ORACLE: expatFriendly.score = 0 (no signals at all)
    assert.equal(result.breakdown.expatFriendly.score, 0)
    assert.equal(result.breakdown.expatFriendly.maxScore, 15)
  })

  test('emailSource page adds 5 points', async ({ assert }) => {
    const result = await service.calculate(
      makeContact({ emailSource: 'page' }),
      makeCompany()
    )
    // ORACLE: expatFriendly.score = 5 (emailSource === 'page' = +5)
    assert.equal(result.breakdown.expatFriendly.score, 5)
  })

  test('accredited visa sponsor adds 8 points', async ({ assert }) => {
    const company = makeCompany({ visaSponsorStatus: 'accredited' })
    const result = await service.calculate(makeContact(), company)
    // ORACLE: expatFriendly.score = 8 (visaSponsorStatus accredited = +8)
    assert.equal(result.breakdown.expatFriendly.score, 8)
  })

  test('all signals combined are capped at 15', async ({ assert }) => {
    const company = makeCompany({
      visaSponsorStatus: 'accredited',
      teamCrawledAt: new Date().toISOString(),
      signals: { expatFriendly: true },
    })
    const contact = makeContact({ emailSource: 'page' })
    const result = await service.calculate(contact, company)
    // ORACLE: raw = 5 (page) + 8 (accredited) + 2 (teamCrawled) + 5 (expatFriendly signal) = 20
    // capped at Math.min(20, 15) = 15
    assert.equal(result.breakdown.expatFriendly.score, 15)
  })
})

test.group('ExpatScoringService — scoreMomentum', () => {
  const service = new ExpatScoringService()

  test('no company returns score 0 / 10', async ({ assert }) => {
    const result = await service.calculate(makeContact(), null)
    // ORACLE: momentum.score = 0 (no company data)
    assert.equal(result.breakdown.momentum.score, 0)
    assert.equal(result.breakdown.momentum.maxScore, 10)
  })

  test('recent funding (< 6 months) returns score 10', async ({ assert }) => {
    const recentDate = new Date()
    recentDate.setMonth(recentDate.getMonth() - 2) // 2 months ago
    const company = makeCompany({ signals: { fundingDate: recentDate.toISOString() } })
    const result = await service.calculate(makeContact(), company)
    // ORACLE: momentum.score = 10 (funding < 6 months ago)
    assert.equal(result.breakdown.momentum.score, 10)
  })

  test('funding 9 months ago returns score 7', async ({ assert }) => {
    const nineMonthsAgo = new Date()
    nineMonthsAgo.setMonth(nineMonthsAgo.getMonth() - 9) // 9 months ago
    const company = makeCompany({ signals: { fundingDate: nineMonthsAgo.toISOString() } })
    const result = await service.calculate(makeContact(), company)
    // ORACLE: momentum.score = 7 (funding > 6 months, <= 12 months)
    assert.equal(result.breakdown.momentum.score, 7)
  })

  test('isHiring signal returns score 8', async ({ assert }) => {
    const company = makeCompany({ signals: { isHiring: true } })
    const result = await service.calculate(makeContact(), company)
    // ORACLE: momentum.score = 8 (isHiring signal)
    assert.equal(result.breakdown.momentum.score, 8)
  })

  test('hiringIntensity >= 3 without signals returns score 6', async ({ assert }) => {
    const company = makeCompany({ hiringIntensity: 4, signals: {} })
    const result = await service.calculate(makeContact(), company)
    // ORACLE: momentum.score = 6 (hiringIntensity 4 >= 3)
    assert.equal(result.breakdown.momentum.score, 6)
  })

  test('company with no signals and low intensity returns score 3', async ({ assert }) => {
    const company = makeCompany({ hiringIntensity: 1, signals: {} })
    const result = await service.calculate(makeContact(), company)
    // ORACLE: momentum.score = 3 (no funding, no isHiring, intensity < 3)
    assert.equal(result.breakdown.momentum.score, 3)
  })
})

test.group('ExpatScoringService — total score', () => {
  const service = new ExpatScoringService()

  test('total is sum of all sub-scores', async ({ assert }) => {
    const company = makeCompany({
      visaSponsorStatus: 'accredited',
      visaSponsorCountries: ['NZ'],
      hiringIntensity: 5,
      signals: { isHiring: true },
    })
    const contact = makeContact({
      role: 'Head of Engineering',
      relevanceScore: null,
      emailSource: 'page',
    })
    const result = await service.calculate(contact, company)
    // ORACLE:
    // visa = 25 (accredited)
    // role = 22 (senior keyword "head of")
    // hiring = 20 (intensity 5 >= 5)
    // expatFriendly = 5 (emailSource page) + 8 (accredited) = 13
    // momentum = 8 (isHiring signal)
    // total = 25 + 22 + 20 + 13 + 8 = 88
    const b = result.breakdown
    assert.equal(b.visa.score + b.role.score + b.hiring.score + b.expatFriendly.score + b.momentum.score, result.score)
    assert.equal(result.score, 88)
  })

  test('version is always expat_v2', async ({ assert }) => {
    const result = await service.calculate(makeContact(), null)
    assert.equal(result.version, 'expat_v2')
  })

  test('factors array has exactly 5 entries', async ({ assert }) => {
    const result = await service.calculate(makeContact(), null)
    assert.equal(result.factors.length, 5)
  })
})
