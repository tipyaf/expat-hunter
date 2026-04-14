import { test } from '@japa/runner'
import { JobOfferScraperRegistry, jobOfferScraperRegistry } from '../../../app/scrapers/job_offer_scraper_registry.js'

// Import the registration side-effect
import '../../../app/scrapers/register_job_offer_scrapers.js'

test.group('JobOfferScraperRegistry', () => {
  test('singleton registry has all 4 platforms registered', ({ assert }) => {
    const all = jobOfferScraperRegistry.getAll()
    assert.isTrue(all.length >= 4, `Expected at least 4 scrapers, got ${all.length}`)

    const platforms = all.map((s) => s.platform)
    assert.include(platforms, 'seek')
    assert.include(platforms, 'linkedin')
    assert.include(platforms, 'builtin')
    assert.include(platforms, 'zeil')
  })

  test('getForPlatform returns correct scraper for each platform', ({ assert }) => {
    const seek = jobOfferScraperRegistry.getForPlatform('seek')
    assert.isNotNull(seek)
    assert.equal(seek!.platform, 'seek')
    assert.equal(seek!.name, 'seek-jobs')

    const linkedin = jobOfferScraperRegistry.getForPlatform('linkedin')
    assert.isNotNull(linkedin)
    assert.equal(linkedin!.platform, 'linkedin')

    const builtin = jobOfferScraperRegistry.getForPlatform('builtin')
    assert.isNotNull(builtin)
    assert.equal(builtin!.platform, 'builtin')

    const zeil = jobOfferScraperRegistry.getForPlatform('zeil')
    assert.isNotNull(zeil)
    assert.equal(zeil!.platform, 'zeil')
  })

  test('getForPlatform returns null for unknown platform', ({ assert }) => {
    const registry = new JobOfferScraperRegistry()
    const result = registry.getForPlatform('unknown' as any)
    assert.isNull(result)
  })

  test('new empty registry has no scrapers', ({ assert }) => {
    const registry = new JobOfferScraperRegistry()
    assert.equal(registry.getAll().length, 0)
  })
})
