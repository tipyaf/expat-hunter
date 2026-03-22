import { test } from '@japa/runner'
import MarketSnapshotService from '#services/market_snapshot_service'
import ExternalCache from '#models/external_cache'

test.group('MarketSnapshotService', (group) => {
  const service = new MarketSnapshotService()

  group.each.setup(async () => {
    await ExternalCache.query()
      .where('entityType', 'market')
      .delete()
  })

  test('getSnapshot returns data for known country (NZ)', async ({ assert }) => {
    const snapshot = await service.getSnapshot('NZ')

    assert.equal(snapshot.country, 'NZ')
    assert.isNull(snapshot.sector)
    assert.isString(snapshot.trend)
    assert.isString(snapshot.bestPeriod)
    assert.isAbove(snapshot.estimatedOffers, 0)
    assert.isNotNull(snapshot.averageSalary)
    assert.isArray(snapshot.insights)
    assert.isAbove(snapshot.insights.length, 0)
  })

  test('getSnapshot returns data for known country (AU)', async ({ assert }) => {
    const snapshot = await service.getSnapshot('AU')

    assert.equal(snapshot.country, 'AU')
    assert.isString(snapshot.trend)
    assert.isAbove(snapshot.estimatedOffers, 0)
    assert.isNotNull(snapshot.averageSalary)
    assert.isArray(snapshot.insights)
    assert.isAbove(snapshot.insights.length, 0)
  })

  test('getSnapshot returns generic data for unknown country', async ({ assert }) => {
    const snapshot = await service.getSnapshot('Narnia')

    assert.equal(snapshot.country, 'Narnia')
    assert.isString(snapshot.trend)
    assert.isArray(snapshot.insights)
    assert.isAbove(snapshot.insights.length, 0)
  })

  test('getSnapshot caches result and returns from cache on second call', async ({ assert }) => {
    // First call — should create cache entry
    const snapshot1 = await service.getSnapshot('CA')
    assert.equal(snapshot1.country, 'CA')

    // Verify cache entry exists
    const cacheEntry = await ExternalCache.query()
      .where('source', 'market_snapshot')
      .where('entityType', 'market')
      .where('entityKey', 'ca::all')
      .first()

    assert.isNotNull(cacheEntry)

    // Second call — should return from cache
    const snapshot2 = await service.getSnapshot('CA')
    assert.equal(snapshot2.country, 'CA')
    assert.deepEqual(snapshot1, snapshot2)
  })

  test('getSnapshot uses sector in cache key', async ({ assert }) => {
    const snapshot = await service.getSnapshot('NZ', 'technology')

    assert.equal(snapshot.country, 'NZ')
    assert.equal(snapshot.sector, 'technology')

    const cacheEntry = await ExternalCache.query()
      .where('source', 'market_snapshot')
      .where('entityKey', 'nz::technology')
      .first()

    assert.isNotNull(cacheEntry)
  })
})
