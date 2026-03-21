import { test } from '@japa/runner'
import ExternalCache from '#models/external_cache'
import CacheService from '#services/cache_service'
import { DateTime } from 'luxon'

test.group('CacheService', (group) => {
  const cacheService = new CacheService()

  group.each.setup(async () => {
    await ExternalCache.query().delete()
  })

  test('getOrFetch returns fetcher result and caches it', async ({ assert }) => {
    let fetcherCalled = 0
    const fetcher = async () => {
      fetcherCalled++
      return { name: 'Test Company', country: 'NZ' }
    }

    const result1 = await cacheService.getOrFetch('seek', 'company', 'test-co', fetcher)
    assert.equal(result1.fromCache, false)
    assert.equal(result1.data.name, 'Test Company')
    assert.equal(fetcherCalled, 1)

    // Second call should use cache
    const result2 = await cacheService.getOrFetch('seek', 'company', 'test-co', fetcher)
    assert.equal(result2.fromCache, true)
    assert.equal(result2.data.name, 'Test Company')
    assert.equal(fetcherCalled, 1) // Fetcher NOT called again
  })

  test('getOrFetch calls fetcher when cache is expired', async ({ assert }) => {
    // Create an expired cache entry
    await ExternalCache.create({
      source: 'seek',
      entityType: 'company',
      entityKey: 'expired-co',
      data: { name: 'Old Data' },
      fetchedAt: DateTime.now().minus({ days: 60 }),
      expiresAt: DateTime.now().minus({ days: 1 }),
    })

    let fetcherCalled = 0
    const fetcher = async () => {
      fetcherCalled++
      return { name: 'Fresh Data' }
    }

    const result = await cacheService.getOrFetch('seek', 'company', 'expired-co', fetcher)
    assert.equal(result.fromCache, false)
    assert.equal(result.data.name, 'Fresh Data')
    assert.equal(fetcherCalled, 1)
  })

  test('get returns null for expired entries', async ({ assert }) => {
    await ExternalCache.create({
      source: 'seek',
      entityType: 'contact',
      entityKey: 'expired-contact',
      data: { name: 'Old' },
      fetchedAt: DateTime.now().minus({ days: 30 }),
      expiresAt: DateTime.now().minus({ hours: 1 }),
    })

    const result = await cacheService.get('seek', 'contact', 'expired-contact')
    assert.isNull(result)
  })

  test('purgeExpired removes only expired entries', async ({ assert }) => {
    // Create one fresh, one expired
    await ExternalCache.create({
      source: 'seek',
      entityType: 'company',
      entityKey: 'fresh',
      data: { name: 'Fresh' },
      fetchedAt: DateTime.now(),
      expiresAt: DateTime.now().plus({ days: 30 }),
    })
    await ExternalCache.create({
      source: 'seek',
      entityType: 'company',
      entityKey: 'stale',
      data: { name: 'Stale' },
      fetchedAt: DateTime.now().minus({ days: 60 }),
      expiresAt: DateTime.now().minus({ days: 1 }),
    })

    const purged = await cacheService.purgeExpired()
    assert.equal(purged, 1)

    const remaining = await ExternalCache.query()
    assert.equal(remaining.length, 1)
    assert.equal(remaining[0].entityKey, 'fresh')
  })

  test('getStats returns correct counts', async ({ assert }) => {
    await ExternalCache.create({
      source: 'seek',
      entityType: 'company',
      entityKey: 'co1',
      data: { name: 'A' },
      fetchedAt: DateTime.now(),
      expiresAt: DateTime.now().plus({ days: 30 }),
    })
    await ExternalCache.create({
      source: 'apify',
      entityType: 'contact',
      entityKey: 'ct1',
      data: { name: 'B' },
      fetchedAt: DateTime.now().minus({ days: 5 }),
      expiresAt: DateTime.now().plus({ days: 9 }),
    })

    const stats = await cacheService.getStats()
    assert.equal(stats.totalEntries, 2)
    assert.equal(stats.expiredEntries, 0)
    assert.property(stats.byType, 'company')
    assert.property(stats.byType, 'contact')
    assert.equal(stats.byType.company.count, 1)
    assert.equal(stats.bySource.seek, 1)
    assert.equal(stats.bySource.apify, 1)
  })
})
