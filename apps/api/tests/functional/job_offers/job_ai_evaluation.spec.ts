import { test } from '@japa/runner'
import User from '#models/user'
import JobSearch from '#models/job_search'
import JobOffer from '#models/job_offer'
import JobOfferLink from '#models/job_offer_link'
import JobOfferExclusion from '#models/job_offer_exclusion'
import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'
import { DateTime } from 'luxon'

test.group('Job AI Evaluation API', () => {
  const TEST_EMAIL = 'job-ai-eval-test@example.com'
  const TEST_EMAIL_B = 'job-ai-eval-test-b@example.com'
  let token: string
  let userId: string
  let tokenB: string
  let searchId: string
  let offerId: string

  test('setup: create test users and seed data', async ({ client, assert }) => {
    // User A
    let res = await client.post('/api/auth/register').json({
      email: TEST_EMAIL,
      password: TEST_USER_PASSWORD,
      fullName: 'AI Eval Test',
    })
    if (res.status() === 200) {
      token = res.body().token
      userId = res.body().user.id
    } else {
      const loginRes = await client.post('/api/auth/login').json({
        email: TEST_EMAIL,
        password: TEST_USER_PASSWORD,
      })
      loginRes.assertStatus(200)
      token = loginRes.body().token
      userId = loginRes.body().user.id
    }

    // User B
    res = await client.post('/api/auth/register').json({
      email: TEST_EMAIL_B,
      password: TEST_USER_PASSWORD,
      fullName: 'AI Eval Test B',
    })
    if (res.status() === 200) {
      tokenB = res.body().token
    } else {
      const loginRes = await client.post('/api/auth/login').json({
        email: TEST_EMAIL_B,
        password: TEST_USER_PASSWORD,
      })
      loginRes.assertStatus(200)
      tokenB = loginRes.body().token
    }

    // Create a search for user A
    const search = await JobSearch.create({
      userId,
      roles: ['Developer'],
      countries: ['NZ'],
      platforms: ['seek'],
      seniority: 'intermediate',
      frequency: 'manual',
      isActive: true,
    })
    searchId = search.id

    // Create an evaluated offer for user A's search
    const offer = await JobOffer.create({
      searchId,
      title: 'Senior Developer',
      descriptionRaw: 'Great opportunity',
      status: 'evaluated',
      relevanceScore: 85,
      matchSummary: 'Strong match.',
      selectionReason: 'Skills align well.',
      applicationAdvice: 'Apply with cover letter.',
      salaryMin: 80000,
      salaryMax: 120000,
      salaryCurrency: 'NZD',
      location: 'Auckland, NZ',
      remoteType: 'hybrid',
      publicationDates: [DateTime.now().toISO()],
      isRepublished: false,
    })
    offerId = offer.id

    await JobOfferLink.create({
      offerId: offer.id,
      platform: 'seek',
      url: 'https://seek.co.nz/job/99999',
      applyUrl: 'https://seek.co.nz/apply/99999',
      externalId: 'SEEK-99999',
      scrapedAt: DateTime.now(),
    })

    assert.isString(searchId)
    assert.isString(offerId)
  })

  // --- POST /api/job-offers/:id/exclude ---

  test('POST /:id/exclude returns 401 without auth', async ({ client }) => {
    const res = await client.post(`/api/job-offers/${offerId}/exclude`).json({
      category: 'salary',
      reason: 'Too low',
    })
    res.assertStatus(401)
  })

  test('POST /:id/exclude excludes an offer with valid category and reason', async ({ client, assert }) => {
    const res = await client
      .post(`/api/job-offers/${offerId}/exclude`)
      .header('Authorization', `Bearer ${token}`)
      .json({ category: 'salary', reason: 'Below 120k NZD' })
    res.assertStatus(200)

    const body = res.body()
    assert.equal(body.data.status, 'excluded')
    assert.equal(body.data.id, offerId)

    // Verify exclusion record exists
    const exclusion = await JobOfferExclusion.query()
      .where('offerId', offerId)
      .where('userId', userId)
      .first()
    assert.isNotNull(exclusion)
    assert.equal(exclusion!.category, 'salary')
    assert.equal(exclusion!.reason, 'Below 120k NZD')
  })

  test('POST /:id/exclude returns 422 for invalid category', async ({ client }) => {
    const res = await client
      .post(`/api/job-offers/${offerId}/exclude`)
      .header('Authorization', `Bearer ${token}`)
      .json({ category: 'invalid_category', reason: 'test' })
    res.assertStatus(422)
  })

  test('POST /:id/exclude returns 404 for other user offer', async ({ client }) => {
    const res = await client
      .post(`/api/job-offers/${offerId}/exclude`)
      .header('Authorization', `Bearer ${tokenB}`)
      .json({ category: 'salary', reason: 'test' })
    res.assertStatus(404)
  })

  test('POST /:id/exclude works with empty reason', async ({ client, assert }) => {
    // Reset offer status for this test
    const offer = await JobOffer.findOrFail(offerId)
    offer.status = 'evaluated'
    await offer.save()

    const res = await client
      .post(`/api/job-offers/${offerId}/exclude`)
      .header('Authorization', `Bearer ${token}`)
      .json({ category: 'location' })
    res.assertStatus(200)
    assert.equal(res.body().data.status, 'excluded')
  })

  // --- PUT /api/job-offers/:id/advice ---

  test('PUT /:id/advice returns 401 without auth', async ({ client }) => {
    const res = await client.put(`/api/job-offers/${offerId}/advice`).json({
      applicationAdvice: 'New advice text.',
    })
    res.assertStatus(401)
  })

  test('PUT /:id/advice updates application advice', async ({ client, assert }) => {
    const res = await client
      .put(`/api/job-offers/${offerId}/advice`)
      .header('Authorization', `Bearer ${token}`)
      .json({ applicationAdvice: 'Updated advice: mention remote experience.' })
    res.assertStatus(200)

    const body = res.body()
    assert.equal(body.data.applicationAdvice, 'Updated advice: mention remote experience.')
  })

  test('PUT /:id/advice returns 422 for empty advice', async ({ client }) => {
    const res = await client
      .put(`/api/job-offers/${offerId}/advice`)
      .header('Authorization', `Bearer ${token}`)
      .json({ applicationAdvice: '' })
    res.assertStatus(422)
  })

  test('PUT /:id/advice returns 404 for other user offer', async ({ client }) => {
    const res = await client
      .put(`/api/job-offers/${offerId}/advice`)
      .header('Authorization', `Bearer ${tokenB}`)
      .json({ applicationAdvice: 'test' })
    res.assertStatus(404)
  })

  // --- GET /api/job-offers/exclusions ---

  test('GET /exclusions returns 401 without auth', async ({ client }) => {
    const res = await client.get('/api/job-offers/exclusions')
    res.assertStatus(401)
  })

  test('GET /exclusions returns grouped exclusions for user', async ({ client, assert }) => {
    const res = await client
      .get('/api/job-offers/exclusions')
      .header('Authorization', `Bearer ${token}`)
    res.assertStatus(200)

    const body = res.body()
    assert.isObject(body.data)
    // We created salary + location exclusions above
    assert.property(body.data, 'salary')
    assert.property(body.data, 'location')
    assert.isArray(body.data.salary)
    assert.isAbove(body.data.salary.length, 0)
  })

  test('GET /exclusions returns empty for user with no exclusions', async ({ client, assert }) => {
    const res = await client
      .get('/api/job-offers/exclusions')
      .header('Authorization', `Bearer ${tokenB}`)
    res.assertStatus(200)
    assert.deepEqual(res.body().data, {})
  })

  // --- Cleanup ---

  test('cleanup: remove test data', async () => {
    await JobOfferExclusion.query().where('userId', userId).delete()
    const offers = await JobOffer.query().where('searchId', searchId).select('id')
    const offerIds = offers.map((o) => o.id)
    if (offerIds.length > 0) {
      await JobOfferLink.query().whereIn('offerId', offerIds).delete()
    }
    await JobOffer.query().where('searchId', searchId).delete()
    await JobSearch.query().where('userId', userId).delete()
    await User.query().where('email', TEST_EMAIL).delete()
    await User.query().where('email', TEST_EMAIL_B).delete()
  })
})
