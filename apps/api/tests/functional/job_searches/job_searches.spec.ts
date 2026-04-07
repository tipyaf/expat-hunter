import { test } from '@japa/runner'
import User from '#models/user'
import JobSearch from '#models/job_search'
import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'

test.group('Job Searches API', () => {
  const TEST_EMAIL = 'job-search-api-test@example.com'
  const TEST_EMAIL_B = 'job-search-api-test-b@example.com'
  let token: string
  let userId: string
  let tokenB: string
  let userBId: string
  let searchId: string

  test('setup: create test users', async ({ client, assert }) => {
    // User A
    let res = await client.post('/api/auth/register').json({
      email: TEST_EMAIL,
      password: TEST_USER_PASSWORD,
      fullName: 'Job Search API Test',
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
      fullName: 'Job Search API Test B',
    })
    if (res.status() === 200) {
      tokenB = res.body().token
      userBId = res.body().user.id
    } else {
      const loginRes = await client.post('/api/auth/login').json({
        email: TEST_EMAIL_B,
        password: TEST_USER_PASSWORD,
      })
      loginRes.assertStatus(200)
      tokenB = loginRes.body().token
      userBId = loginRes.body().user.id
    }

    // Ensure both are free plan, clean existing searches
    const userA = await User.findOrFail(userId)
    userA.plan = 'free'
    await userA.save()

    const userB = await User.findOrFail(userBId)
    userB.plan = 'free'
    await userB.save()

    await JobSearch.query().where('userId', userId).delete()
    await JobSearch.query().where('userId', userBId).delete()

    assert.ok(token)
    assert.ok(tokenB)
  })

  // --- Auth ---

  test('GET /api/job-searches returns 401 without auth', async ({ client }) => {
    const res = await client.get('/api/job-searches')
    res.assertStatus(401)
  })

  test('POST /api/job-searches returns 401 without auth', async ({ client }) => {
    const res = await client.post('/api/job-searches').json({
      roles: ['Dev'],
      countries: ['NZ'],
      platforms: ['seek'],
      seniority: 'senior',
    })
    res.assertStatus(401)
  })

  // --- CRUD ---

  test('POST /api/job-searches creates a search (201)', async ({ client, assert }) => {
    const res = await client
      .post('/api/job-searches')
      .header('Authorization', `Bearer ${token}`)
      .json({
        roles: ['Senior Frontend'],
        countries: ['NZ'],
        platforms: ['seek'],
        seniority: 'senior',
      })

    res.assertStatus(201)
    const body = res.body()
    assert.isDefined(body.data.id)
    assert.deepEqual(body.data.roles, ['Senior Frontend'])
    searchId = body.data.id
  })

  test('GET /api/job-searches returns user searches', async ({ client, assert }) => {
    const res = await client
      .get('/api/job-searches')
      .header('Authorization', `Bearer ${token}`)

    res.assertStatus(200)
    const body = res.body()
    assert.isArray(body.data)
    assert.isAbove(body.data.length, 0)
  })

  test('PUT /api/job-searches/:id updates a search (200)', async ({ client, assert }) => {
    const res = await client
      .put(`/api/job-searches/${searchId}`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        roles: ['Senior Frontend', 'React Developer'],
      })

    res.assertStatus(200)
    const body = res.body()
    assert.deepEqual(body.data.roles, ['Senior Frontend', 'React Developer'])
  })

  test('POST /api/job-searches/:id/run triggers a run (200)', async ({ client, assert }) => {
    const res = await client
      .post(`/api/job-searches/${searchId}/run`)
      .header('Authorization', `Bearer ${token}`)

    res.assertStatus(200)
    const body = res.body()
    assert.isNotNull(body.data.lastRunAt)
  })

  // --- Quota enforcement ---

  test('POST /api/job-searches returns 403 for free user at quota', async ({ client }) => {
    // User A already has 1 search (free limit)
    const res = await client
      .post('/api/job-searches')
      .header('Authorization', `Bearer ${token}`)
      .json({
        roles: ['DevOps'],
        countries: ['AU'],
        platforms: ['seek'],
        seniority: 'indifferent',
      })

    res.assertStatus(403)
    res.assertBodyContains({ error: { code: 'QUOTA_EXCEEDED' } })
  })

  // --- User scoping ---

  test('GET /api/job-searches does not return other user searches', async ({ client, assert }) => {
    const res = await client
      .get('/api/job-searches')
      .header('Authorization', `Bearer ${tokenB}`)

    res.assertStatus(200)
    const body = res.body()
    assert.equal(body.data.length, 0)
  })

  test('PUT /api/job-searches/:id returns 404 for other user search', async ({ client }) => {
    const res = await client
      .put(`/api/job-searches/${searchId}`)
      .header('Authorization', `Bearer ${tokenB}`)
      .json({ roles: ['Hacker'] })

    res.assertStatus(404)
  })

  // --- Delete ---

  test('DELETE /api/job-searches/:id deletes the search (200)', async ({ client, assert }) => {
    const res = await client
      .delete(`/api/job-searches/${searchId}`)
      .header('Authorization', `Bearer ${token}`)

    res.assertStatus(200)
    assert.deepEqual(res.body().data, { deleted: true })
  })

  test('DELETE /api/job-searches/:id returns 404 for non-existent', async ({ client }) => {
    const res = await client
      .delete(`/api/job-searches/${searchId}`)
      .header('Authorization', `Bearer ${token}`)

    res.assertStatus(404)
  })

  // --- Cleanup ---

  test('cleanup', async () => {
    await JobSearch.query().where('userId', userId).delete()
    await JobSearch.query().where('userId', userBId).delete()
    const userA = await User.find(userId)
    if (userA) await userA.delete()
    const userB = await User.find(userBId)
    if (userB) await userB.delete()
  })
})
