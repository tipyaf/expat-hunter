import { test } from '@japa/runner'
import ContextEnrichmentService from '#services/context_enrichment_service'

const service = new ContextEnrichmentService()

// ---------------------------------------------------------------------------
// enrich — integration (uses real network, may be slow)
// ---------------------------------------------------------------------------

test.group('ContextEnrichmentService — enrich', () => {
  test('returns valid structure even for unknown domain', async ({ assert }) => {
    const result = await service.enrich('this-domain-does-not-exist-xyz.com', 'Unknown Corp')

    assert.isDefined(result.dataQuality)
    assert.isArray(result.techStack)
    assert.isArray(result.expatFriendlySignals)
    assert.isArray(result.recentNews)
    assert.isArray(result.sources)
    assert.isDefined(result.hiringSignals)
    assert.isDefined(result.hiringSignals.isHiring)
    assert.isDefined(result.hiringSignals.openRolesCount)
  }).timeout(15000)

  test('dataQuality is low when no data is found', async ({ assert }) => {
    const result = await service.enrich('this-domain-does-not-exist-xyz.com', 'Unknown')
    assert.equal(result.dataQuality, 'low')
  }).timeout(15000)
})

// ---------------------------------------------------------------------------
// Structure validation
// ---------------------------------------------------------------------------

test.group('ContextEnrichmentService — CompanyContextData structure', () => {
  test('hiringSignals has correct shape', async ({ assert }) => {
    const result = await service.enrich('fake-domain-no-exist.com', 'Test Corp')
    const hs = result.hiringSignals

    assert.isBoolean(hs.isHiring)
    assert.isNumber(hs.openRolesCount)
    assert.isNumber(hs.techRolesCount)
    // lastJobDate can be null or string
    assert.isTrue(hs.lastJobDate === null || typeof hs.lastJobDate === 'string')
  }).timeout(15000)

  test('sources is always an array', async ({ assert }) => {
    const result = await service.enrich('nonexistent-domain-test.com', 'Test Corp')
    assert.isArray(result.sources)
  }).timeout(15000)

  test('techStack is always an array (never null)', async ({ assert }) => {
    const result = await service.enrich('nonexistent-domain-test.com', 'Test Corp')
    assert.isArray(result.techStack)
  }).timeout(15000)

  test('expatFriendlySignals is always an array (never null)', async ({ assert }) => {
    const result = await service.enrich('nonexistent-domain-test.com', 'Test Corp')
    assert.isArray(result.expatFriendlySignals)
  }).timeout(15000)
})
