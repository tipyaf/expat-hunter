import { test } from '@japa/runner'
import { PLAN_FREE, PLAN_PREMIUM } from '@expat-hunter/shared'
import JobSearchService from '#services/job_search_service'
import JobSearch from '#models/job_search'
import User from '#models/user'

test.group('JobSearchService', (group) => {
  const service = new JobSearchService()
  const TEST_EMAIL_A = 'job-search-test-a@example.com'
  const TEST_EMAIL_B = 'job-search-test-b@example.com'
  let userAId: string
  let userBId: string

  group.setup(async () => {
    // Create test users
    const userA = (await User.findBy('email', TEST_EMAIL_A)) ?? (await User.create({
      email: TEST_EMAIL_A,
      password: 'password123',
      fullName: 'Job Search Test A',
      locale: 'en',
      plan: 'free',
      isAdmin: false,
    }))
    userAId = userA.id

    const userB = (await User.findBy('email', TEST_EMAIL_B)) ?? (await User.create({
      email: TEST_EMAIL_B,
      password: 'password123',
      fullName: 'Job Search Test B',
      locale: 'en',
      plan: 'free',
      isAdmin: false,
    }))
    userBId = userB.id

    // Clean existing searches
    await JobSearch.query().where('userId', userAId).delete()
    await JobSearch.query().where('userId', userBId).delete()
  })

  group.teardown(async () => {
    await JobSearch.query().where('userId', userAId).delete()
    await JobSearch.query().where('userId', userBId).delete()
    await User.query().where('email', TEST_EMAIL_A).delete()
    await User.query().where('email', TEST_EMAIL_B).delete()
  })

  // --- CRUD ---

  test('create: saves a job search and returns it', async ({ assert }) => {
    const result = await service.create(userAId, PLAN_FREE, {
      roles: ['Senior Frontend'],
      countries: ['NZ'],
      platforms: ['seek'],
      seniority: 'senior',
    })

    assert.isDefined(result.id)
    assert.equal(result.userId, userAId)
    assert.deepEqual(result.roles, ['Senior Frontend'])
    assert.deepEqual(result.countries, ['NZ'])
    assert.deepEqual(result.platforms, ['seek'])
    assert.equal(result.seniority, 'senior')
    assert.equal(result.isActive, true)
    assert.equal(result.frequency, 'manual')
  })

  test('list: returns only the user searches', async ({ assert }) => {
    const results = await service.list(userAId)
    assert.isArray(results)
    assert.isAbove(results.length, 0)
    results.forEach((s) => assert.equal(s.userId, userAId))
  })

  test('findOrFail: returns the search when it belongs to user', async ({ assert }) => {
    const searches = await service.list(userAId)
    const search = searches[0]
    const result = await service.findOrFail(userAId, search.id)
    assert.equal(result.id, search.id)
  })

  test('findOrFail: throws 404 when search does not exist', async ({ assert }) => {
    try {
      await service.findOrFail(userAId, '00000000-0000-0000-0000-000000000000')
      assert.fail('Should have thrown')
    } catch (error: any) {
      assert.equal(error.status, 404)
    }
  })

  test('update: updates fields on an existing search', async ({ assert }) => {
    const searches = await service.list(userAId)
    const search = searches[0]
    const updated = await service.update(userAId, search.id, {
      roles: ['Senior Frontend', 'React Developer'],
      seniority: 'lead',
    })

    assert.deepEqual(updated.roles, ['Senior Frontend', 'React Developer'])
    assert.equal(updated.seniority, 'lead')
  })

  test('remove: deletes a search', async ({ assert }) => {
    // Create a search to delete
    const toDelete = await service.create(userAId, PLAN_PREMIUM, {
      roles: ['DevOps'],
      countries: ['AU'],
      platforms: ['linkedin'],
      seniority: 'indifferent',
    })

    await service.remove(userAId, toDelete.id)

    try {
      await service.findOrFail(userAId, toDelete.id)
      assert.fail('Should have thrown 404')
    } catch (error: any) {
      assert.equal(error.status, 404)
    }
  })

  test('triggerRun: updates lastRunAt', async ({ assert }) => {
    const searches = await service.list(userAId)
    const search = searches[0]
    const result = await service.triggerRun(userAId, search.id)
    assert.isNotNull(result.lastRunAt)
  })

  // --- Quota enforcement ---

  test('create: free user at limit (1 active search) gets 403', async ({ assert }) => {
    // userA already has 1 active search from earlier tests
    // ORACLE: existingActiveSearches (1) >= FREE_MAX_SEARCHES (1) -> throw
    try {
      await service.create(userAId, PLAN_FREE, {
        roles: ['Backend Dev'],
        countries: ['CA'],
        platforms: ['builtin'],
        seniority: 'intermediate',
      })
      assert.fail('Should have thrown quota error')
    } catch (error: any) {
      assert.equal(error.status, 403)
      assert.include(error.message, 'quota')
    }
  })

  test('create: free user with 0 active searches is allowed', async ({ assert }) => {
    // userB has 0 searches
    // ORACLE: 0 < FREE_MAX_SEARCHES (1) -> allowed
    const result = await service.create(userBId, PLAN_FREE, {
      roles: ['Data Engineer'],
      countries: ['SG'],
      platforms: ['linkedin'],
      seniority: 'junior',
    })
    assert.isDefined(result.id)
  })

  test('create: premium user with 2 active searches is allowed', async ({ assert }) => {
    // Create a second search for userB as premium
    // ORACLE: 2 < PREMIUM_MAX_SEARCHES (3) -> allowed
    // userB already has 1, create another
    const result = await service.create(userBId, PLAN_PREMIUM, {
      roles: ['ML Engineer'],
      countries: ['US'],
      platforms: ['builtin'],
      seniority: 'senior',
    })
    assert.isDefined(result.id)
    // Now userB has 2 active searches
  })

  test('create: premium user at quota limit (3) gets 403', async ({ assert }) => {
    // Create a third for userB as premium (now at 2, creating 3rd)
    await service.create(userBId, PLAN_PREMIUM, {
      roles: ['DevOps'],
      countries: ['UK'],
      platforms: ['seek'],
      seniority: 'lead',
    })
    // Now userB has 3 active searches
    // ORACLE: 3 >= PREMIUM_MAX_SEARCHES (3) -> throw
    try {
      await service.create(userBId, PLAN_PREMIUM, {
        roles: ['QA Engineer'],
        countries: ['NZ'],
        platforms: ['seek'],
        seniority: 'indifferent',
      })
      assert.fail('Should have thrown quota error')
    } catch (error: any) {
      assert.equal(error.status, 403)
      assert.include(error.message, 'quota')
    }
  })

  // --- User scoping ---

  test('user scoping: user A cannot see user B searches', async ({ assert }) => {
    const searchesA = await service.list(userAId)
    const searchesB = await service.list(userBId)

    searchesA.forEach((s) => assert.equal(s.userId, userAId))
    searchesB.forEach((s) => assert.equal(s.userId, userBId))

    // User A cannot access user B's search
    if (searchesB.length > 0) {
      try {
        await service.findOrFail(userAId, searchesB[0].id)
        assert.fail('Should have thrown 404 for cross-user access')
      } catch (error: any) {
        assert.equal(error.status, 404)
      }
    }
  })

  // --- Salary validation ---

  test('create: rejects when salaryMin > salaryMax', async ({ assert }) => {
    try {
      await service.create(userAId, PLAN_PREMIUM, {
        roles: ['Dev'],
        countries: ['NZ'],
        platforms: ['seek'],
        seniority: 'senior',
        salaryMin: 100000,
        salaryMax: 50000,
      })
      assert.fail('Should have thrown validation error')
    } catch (error: any) {
      assert.equal(error.status, 422)
    }
  })
})
