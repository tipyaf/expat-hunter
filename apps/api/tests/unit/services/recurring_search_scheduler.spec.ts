import { test } from '@japa/runner'
import { PLAN_FREE, PLAN_PREMIUM, computeNextRunAt, FREE_ALLOWED_FREQUENCIES } from '@expat-hunter/shared'
import JobSearchService from '#services/job_search_service'
import RecurringSearchScheduler from '#services/recurring_search_scheduler'
import JobSearch from '#models/job_search'
import User from '#models/user'
import { DateTime } from 'luxon'

// =============================================================================
// computeNextRunAt — pure function tests
// =============================================================================

test.group('computeNextRunAt', () => {
  test('weekly frequency returns reference + 7 days', ({ assert }) => {
    // ORACLE: 2026-04-13T10:00:00Z + 7 days = 2026-04-20T10:00:00.000Z
    const ref = new Date('2026-04-13T10:00:00Z')
    const result = computeNextRunAt('weekly', ref)
    assert.equal(result, '2026-04-20T10:00:00.000Z')
  })

  test('daily frequency returns reference + 1 day', ({ assert }) => {
    // ORACLE: 2026-04-13T10:00:00Z + 1 day = 2026-04-14T10:00:00.000Z
    const ref = new Date('2026-04-13T10:00:00Z')
    const result = computeNextRunAt('daily', ref)
    assert.equal(result, '2026-04-14T10:00:00.000Z')
  })

  test('biweekly frequency returns reference + 3.5 days', ({ assert }) => {
    // ORACLE: 2026-04-13T10:00:00Z + 3 days 12h = 2026-04-16T22:00:00.000Z
    const ref = new Date('2026-04-13T10:00:00Z')
    const result = computeNextRunAt('biweekly', ref)
    assert.equal(result, '2026-04-16T22:00:00.000Z')
  })

  test('manual frequency returns null', ({ assert }) => {
    // ORACLE: manual → null (no recurring run)
    const ref = new Date('2026-04-13T10:00:00Z')
    const result = computeNextRunAt('manual', ref)
    assert.isNull(result)
  })
})

// =============================================================================
// FREE_ALLOWED_FREQUENCIES — constant check
// =============================================================================

test.group('FREE_ALLOWED_FREQUENCIES', () => {
  test('includes manual and weekly', ({ assert }) => {
    assert.includeMembers(FREE_ALLOWED_FREQUENCIES as unknown as string[], ['manual', 'weekly'])
  })

  test('does NOT include daily or biweekly', ({ assert }) => {
    assert.notIncludeMembers(FREE_ALLOWED_FREQUENCIES as unknown as string[], ['daily', 'biweekly'])
  })
})

// =============================================================================
// JobSearchService — frequency enforcement on create/update
// =============================================================================

test.group('JobSearchService — frequency enforcement', (group) => {
  const service = new JobSearchService()
  const TEST_EMAIL_FREQ = 'freq-enforce-test@example.com'
  let userId: string

  group.setup(async () => {
    const user = (await User.findBy('email', TEST_EMAIL_FREQ)) ?? (await User.create({
      email: TEST_EMAIL_FREQ,
      password: 'password123',
      fullName: 'Freq Test User',
      locale: 'en',
      plan: 'free',
      isAdmin: false,
    }))
    userId = user.id
    await JobSearch.query().where('userId', userId).delete()
  })

  group.teardown(async () => {
    await JobSearch.query().where('userId', userId).delete()
    await User.query().where('email', TEST_EMAIL_FREQ).delete()
  })

  group.each.teardown(async () => {
    await JobSearch.query().where('userId', userId).delete()
  })

  test('create with frequency=weekly sets next_run_at to +7 days', async ({ assert }) => {
    const before = new Date()
    const result = await service.create(userId, PLAN_FREE, {
      roles: ['Dev'],
      countries: ['NZ'],
      platforms: ['seek'],
      seniority: 'senior',
      frequency: 'weekly',
    })

    assert.isNotNull(result.nextRunAt)
    // ORACLE: next_run_at should be ~7 days from now
    const nextRun = result.nextRunAt!.toJSDate()
    const expectedMin = new Date(before.getTime() + 6.9 * 24 * 60 * 60 * 1000)
    const expectedMax = new Date(before.getTime() + 7.1 * 24 * 60 * 60 * 1000)
    assert.isTrue(nextRun >= expectedMin && nextRun <= expectedMax, 'nextRunAt should be ~7 days from now')
  })

  test('create with frequency=manual sets next_run_at to null', async ({ assert }) => {
    const result = await service.create(userId, PLAN_FREE, {
      roles: ['Dev'],
      countries: ['NZ'],
      platforms: ['seek'],
      seniority: 'senior',
      frequency: 'manual',
    })

    // ORACLE: manual → next_run_at is null
    assert.isNull(result.nextRunAt)
  })

  test('create with default frequency (no frequency param) sets next_run_at to null', async ({ assert }) => {
    const result = await service.create(userId, PLAN_FREE, {
      roles: ['Dev'],
      countries: ['NZ'],
      platforms: ['seek'],
      seniority: 'senior',
    })

    // ORACLE: default frequency is manual → next_run_at is null
    assert.equal(result.frequency, 'manual')
    assert.isNull(result.nextRunAt)
  })

  test('free user trying daily frequency is rejected with 403 PLAN_REQUIRED', async ({ assert }) => {
    try {
      await service.create(userId, PLAN_FREE, {
        roles: ['Dev'],
        countries: ['NZ'],
        platforms: ['seek'],
        seniority: 'senior',
        frequency: 'daily',
      })
      assert.fail('Expected PLAN_REQUIRED error')
    } catch (error: unknown) {
      const err = error as Error & { status: number; code: string }
      assert.equal(err.status, 403)
      assert.equal(err.code, 'PLAN_REQUIRED')
    }
  })

  test('free user trying biweekly frequency is rejected with 403', async ({ assert }) => {
    try {
      await service.create(userId, PLAN_FREE, {
        roles: ['Dev'],
        countries: ['NZ'],
        platforms: ['seek'],
        seniority: 'senior',
        frequency: 'biweekly',
      })
      assert.fail('Expected PLAN_REQUIRED error')
    } catch (error: unknown) {
      const err = error as Error & { status: number; code: string }
      assert.equal(err.status, 403)
      assert.equal(err.code, 'PLAN_REQUIRED')
    }
  })

  test('premium user can create with daily frequency', async ({ assert }) => {
    const result = await service.create(userId, PLAN_PREMIUM, {
      roles: ['Dev'],
      countries: ['NZ'],
      platforms: ['seek'],
      seniority: 'senior',
      frequency: 'daily',
    })

    assert.equal(result.frequency, 'daily')
    assert.isNotNull(result.nextRunAt)
  })

  test('update frequency from manual to daily recomputes next_run_at', async ({ assert }) => {
    // First set user to premium so the update can use daily
    await User.query().where('id', userId).update({ plan: 'premium' })

    const search = await service.create(userId, PLAN_PREMIUM, {
      roles: ['Dev'],
      countries: ['NZ'],
      platforms: ['seek'],
      seniority: 'senior',
      frequency: 'manual',
    })
    assert.isNull(search.nextRunAt)

    const before = new Date()
    const updated = await service.update(userId, search.id, { frequency: 'daily' })

    assert.equal(updated.frequency, 'daily')
    assert.isNotNull(updated.nextRunAt)
    // ORACLE: next_run_at should be ~1 day from now
    const nextRun = updated.nextRunAt!.toJSDate()
    const expectedMin = new Date(before.getTime() + 0.9 * 24 * 60 * 60 * 1000)
    assert.isTrue(nextRun >= expectedMin, 'nextRunAt should be ~1 day from now')

    // Reset user plan
    await User.query().where('id', userId).update({ plan: 'free' })
  })
})

// =============================================================================
// RecurringSearchScheduler — runDueSearches
// =============================================================================

test.group('RecurringSearchScheduler — runDueSearches', (group) => {
  const TEST_EMAIL_SCHED = 'scheduler-test@example.com'
  let userId: string

  // Mock scraping service that succeeds
  const mockScrapingService = {
    runForSearch: async (_searchId: string, _userId: string) => ({
      totalScraped: 0,
      newOffers: 0,
      duplicates: 0,
      quotaExceeded: 0,
      errors: [],
    }),
  }

  group.setup(async () => {
    const user = (await User.findBy('email', TEST_EMAIL_SCHED)) ?? (await User.create({
      email: TEST_EMAIL_SCHED,
      password: 'password123',
      fullName: 'Scheduler Test User',
      locale: 'en',
      plan: 'premium',
      isAdmin: false,
    }))
    userId = user.id
    await JobSearch.query().where('userId', userId).delete()
  })

  group.teardown(async () => {
    await JobSearch.query().where('userId', userId).delete()
    await User.query().where('email', TEST_EMAIL_SCHED).delete()
  })

  group.each.teardown(async () => {
    await JobSearch.query().where('userId', userId).delete()
  })

  test('runs due searches and updates next_run_at', async ({ assert }) => {
    // Create a search with nextRunAt in the past (= due)
    const pastDate = DateTime.now().minus({ hours: 1 })
    await JobSearch.create({
      userId,
      roles: JSON.stringify(['Dev']) as unknown as string[],
      countries: JSON.stringify(['NZ']) as unknown as string[],
      platforms: JSON.stringify(['seek']) as unknown as string[],
      seniority: 'senior',
      frequency: 'daily',
      isActive: true,
      nextRunAt: pastDate,
    })

    const scheduler = new RecurringSearchScheduler(mockScrapingService as any)
    const result = await scheduler.runDueSearches()

    // ORACLE: 1 search is due → runs it
    assert.equal(result.searchesRun, 1)
    assert.lengthOf(result.searchIds, 1)
    assert.lengthOf(result.errors, 0)

    // Verify next_run_at was updated
    const updatedSearch = await JobSearch.find(result.searchIds[0])
    assert.isNotNull(updatedSearch?.nextRunAt)
    assert.isNotNull(updatedSearch?.lastRunAt)
  })

  test('skips future searches (not yet due)', async ({ assert }) => {
    // Create a search with nextRunAt in the future
    const futureDate = DateTime.now().plus({ days: 5 })
    await JobSearch.create({
      userId,
      roles: JSON.stringify(['Dev']) as unknown as string[],
      countries: JSON.stringify(['NZ']) as unknown as string[],
      platforms: JSON.stringify(['seek']) as unknown as string[],
      seniority: 'weekly',
      frequency: 'weekly',
      isActive: true,
      nextRunAt: futureDate,
    })

    const scheduler = new RecurringSearchScheduler(mockScrapingService as any)
    const result = await scheduler.runDueSearches()

    // ORACLE: search is in the future → not run
    assert.equal(result.searchesRun, 0)
    assert.lengthOf(result.searchIds, 0)
  })

  test('skips manual searches (next_run_at is null)', async ({ assert }) => {
    await JobSearch.create({
      userId,
      roles: JSON.stringify(['Dev']) as unknown as string[],
      countries: JSON.stringify(['NZ']) as unknown as string[],
      platforms: JSON.stringify(['seek']) as unknown as string[],
      seniority: 'senior',
      frequency: 'manual',
      isActive: true,
      nextRunAt: null,
    })

    const scheduler = new RecurringSearchScheduler(mockScrapingService as any)
    const result = await scheduler.runDueSearches()

    // ORACLE: manual search has null next_run_at → not picked up
    assert.equal(result.searchesRun, 0)
  })

  test('skips inactive searches even if due', async ({ assert }) => {
    const pastDate = DateTime.now().minus({ hours: 1 })
    await JobSearch.create({
      userId,
      roles: JSON.stringify(['Dev']) as unknown as string[],
      countries: JSON.stringify(['NZ']) as unknown as string[],
      platforms: JSON.stringify(['seek']) as unknown as string[],
      seniority: 'senior',
      frequency: 'daily',
      isActive: false,
      nextRunAt: pastDate,
    })

    const scheduler = new RecurringSearchScheduler(mockScrapingService as any)
    const result = await scheduler.runDueSearches()

    // ORACLE: inactive search → skipped even though due
    assert.equal(result.searchesRun, 0)
  })

  test('handles scraping errors gracefully — continues other searches', async ({ assert }) => {
    const pastDate = DateTime.now().minus({ hours: 1 })
    await JobSearch.create({
      userId,
      roles: JSON.stringify(['Fail']) as unknown as string[],
      countries: JSON.stringify(['NZ']) as unknown as string[],
      platforms: JSON.stringify(['seek']) as unknown as string[],
      seniority: 'senior',
      frequency: 'daily',
      isActive: true,
      nextRunAt: pastDate,
    })
    await JobSearch.create({
      userId,
      roles: JSON.stringify(['Pass']) as unknown as string[],
      countries: JSON.stringify(['NZ']) as unknown as string[],
      platforms: JSON.stringify(['seek']) as unknown as string[],
      seniority: 'senior',
      frequency: 'daily',
      isActive: true,
      nextRunAt: pastDate,
    })

    let callCount = 0
    const failThenSucceed = {
      runForSearch: async () => {
        callCount++
        if (callCount === 1) throw new Error('Scraping failed')
        return { totalScraped: 0, newOffers: 0, duplicates: 0, quotaExceeded: 0, errors: [] }
      },
    }

    const scheduler = new RecurringSearchScheduler(failThenSucceed as any)
    const result = await scheduler.runDueSearches()

    // ORACLE: first fails, second succeeds → 1 run + 1 error
    assert.equal(result.searchesRun, 1)
    assert.lengthOf(result.errors, 1)
    assert.equal(result.errors[0].message, 'Scraping failed')
  })

  test('no due searches returns empty result', async ({ assert }) => {
    const scheduler = new RecurringSearchScheduler(mockScrapingService as any)
    const result = await scheduler.runDueSearches()

    // ORACLE: no searches at all → 0 runs
    assert.equal(result.searchesRun, 0)
    assert.lengthOf(result.searchIds, 0)
    assert.lengthOf(result.errors, 0)
  })
})
