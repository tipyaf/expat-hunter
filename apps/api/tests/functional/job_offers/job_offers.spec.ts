import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import JobOffer from '#models/job_offer'
import JobOfferLink from '#models/job_offer_link'
import JobSearch from '#models/job_search'
import User from '#models/user'
import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'

test.group('Job Offers API', () => {
  const TEST_EMAIL = 'job-offers-api-test@example.com'
  const TEST_EMAIL_B = 'job-offers-api-test-b@example.com'
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
      fullName: 'Job Offers API Test',
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
      fullName: 'Job Offers API Test B',
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

    // Create an offer for user A's search
    const offer = await JobOffer.create({
      searchId,
      title: 'Senior Developer',
      descriptionRaw: 'Great opportunity',
      status: 'new',
      salaryMin: 80000,
      salaryMax: 120000,
      salaryCurrency: 'NZD',
      location: 'Auckland, NZ',
      remoteType: 'hybrid',
      publicationDates: [DateTime.now().toISO()],
      isRepublished: false,
    })
    offerId = offer.id

    // Create a link for the offer
    await JobOfferLink.create({
      offerId: offer.id,
      platform: 'seek',
      url: 'https://seek.co.nz/job/12345',
      applyUrl: 'https://seek.co.nz/apply/12345',
      externalId: 'SEEK-12345',
      scrapedAt: DateTime.now(),
    })

    assert.isString(searchId)
    assert.isString(offerId)
  })

  // --- GET /api/job-offers ---

  test('GET /api/job-offers returns 401 without auth', async ({ client }) => {
    const res = await client.get('/api/job-offers')
    res.assertStatus(401)
  })

  test('GET /api/job-offers without search_id returns all user offers across searches', async ({
    client,
    assert,
  }) => {
    // Since sc-884 (Job Offers List Page), omitting search_id returns all offers
    // from every search owned by the authenticated user (used by the /offres kanban).
    const res = await client.get('/api/job-offers').header('Authorization', `Bearer ${token}`)
    res.assertStatus(200)
    assert.isArray(res.body().data)
    assert.isAbove(res.body().data.length, 0, 'user has at least one seeded offer')
    for (const offer of res.body().data) {
      assert.equal(offer.searchId, searchId)
    }
  })

  test('GET /api/job-offers returns paginated offers', async ({ client, assert }) => {
    const res = await client
      .get(`/api/job-offers?search_id=${searchId}`)
      .header('Authorization', `Bearer ${token}`)
    res.assertStatus(200)

    const body = res.body()
    assert.isArray(body.data)
    assert.isObject(body.meta)
    assert.property(body.meta, 'total')
    assert.isAbove(body.data.length, 0)

    // Verify offer structure
    const offer = body.data[0]
    assert.equal(offer.searchId, searchId)
    assert.equal(offer.title, 'Senior Developer')
    assert.isArray(offer.links)
    assert.isAbove(offer.links.length, 0)
  })

  test('GET /api/job-offers filters by status', async ({ client, assert }) => {
    const res = await client
      .get(`/api/job-offers?search_id=${searchId}&status=new`)
      .header('Authorization', `Bearer ${token}`)
    res.assertStatus(200)
    assert.isAbove(res.body().data.length, 0)
    for (const offer of res.body().data) {
      assert.equal(offer.status, 'new')
    }
  })

  test('GET /api/job-offers returns empty for non-matching status', async ({ client, assert }) => {
    const res = await client
      .get(`/api/job-offers?search_id=${searchId}&status=archived`)
      .header('Authorization', `Bearer ${token}`)
    res.assertStatus(200)
    assert.lengthOf(res.body().data, 0)
  })

  test('GET /api/job-offers returns 404 for other user search', async ({ client }) => {
    const res = await client
      .get(`/api/job-offers?search_id=${searchId}`)
      .header('Authorization', `Bearer ${tokenB}`)
    res.assertStatus(404)
  })

  // --- GET /api/job-offers/:id ---

  test('GET /api/job-offers/:id returns 401 without auth', async ({ client }) => {
    const res = await client.get(`/api/job-offers/${offerId}`)
    res.assertStatus(401)
  })

  test('GET /api/job-offers/:id returns full offer with links', async ({ client, assert }) => {
    const res = await client
      .get(`/api/job-offers/${offerId}`)
      .header('Authorization', `Bearer ${token}`)
    res.assertStatus(200)

    const offer = res.body().data
    assert.equal(offer.id, offerId)
    assert.equal(offer.title, 'Senior Developer')
    assert.isArray(offer.links)
    assert.isAbove(offer.links.length, 0)
    assert.equal(offer.links[0].platform, 'seek')
    assert.equal(offer.links[0].externalId, 'SEEK-12345')
  })

  test('GET /api/job-offers/:id returns 404 for non-existent offer', async ({ client }) => {
    const res = await client
      .get('/api/job-offers/00000000-0000-0000-0000-000000000000')
      .header('Authorization', `Bearer ${token}`)
    res.assertStatus(404)
  })

  test('GET /api/job-offers/:id returns 404 for other user offer', async ({ client }) => {
    const res = await client
      .get(`/api/job-offers/${offerId}`)
      .header('Authorization', `Bearer ${tokenB}`)
    res.assertStatus(404)
  })

  // --- Cleanup ---

  test('cleanup: remove test data', async () => {
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
