import { test } from '@japa/runner'
import { ZeilJobScraper } from '../../../app/scrapers/zeil_job_scraper.js'

const originalFetch = globalThis.fetch

test.group('ZeilJobScraper', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('has correct name and platform', ({ assert }) => {
    const scraper = new ZeilJobScraper()
    assert.equal(scraper.name, 'zeil-jobs')
    assert.equal(scraper.platform, 'zeil')
  })

  test('throws error when APIFY_TOKEN is not set', async ({ assert }) => {
    const scraper = new ZeilJobScraper()
    if (!scraper.isConfigured) {
      await assert.rejects(
        () => scraper.scrape({ roles: ['Dev'], country: 'NZ' }),
        'APIFY_TOKEN is not configured'
      )
    }
  })

  test('returns RawJobOffer[] from Apify Zeil actor', async ({ assert }) => {
    // ORACLE: Zeil result → RawJobOffer with platform='zeil'
    const mockItems = [
      {
        title: 'Full Stack Developer',
        company: 'Kiwi Tech Ltd',
        location: 'Wellington, NZ',
        url: 'https://zeil.co.nz/job/789',
        id: '789',
        salary: '$90,000 - $120,000',
        description: 'NZ-based opportunity',
        type: 'Full Time, Onsite',
        closing_date: '2026-05-01',
      },
    ]

    globalThis.fetch = async () =>
      new Response(JSON.stringify(mockItems), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const scraper = new ZeilJobScraper()
    Object.defineProperty(scraper, 'apiToken', { value: 'test-token', writable: false })

    const result = await scraper.scrape({ roles: ['Full Stack Developer'], country: 'NZ' })

    assert.isArray(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0].platform, 'zeil')
    assert.equal(result[0].title, 'Full Stack Developer')
    assert.equal(result[0].company, 'Kiwi Tech Ltd')
    assert.equal(result[0].externalId, '789')
    // ORACLE: "$90,000 - $120,000" → min=90000, max=120000
    assert.equal(result[0].salaryMin, 90000)
    assert.equal(result[0].salaryMax, 120000)
    assert.equal(result[0].closingDate, '2026-05-01')
    assert.equal(result[0].remoteType, 'onsite')
  })

  test('throws error when Apify returns error', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response('Error', { status: 500 })

    const scraper = new ZeilJobScraper()
    Object.defineProperty(scraper, 'apiToken', { value: 'test-token', writable: false })

    await assert.rejects(
      () => scraper.scrape({ roles: ['Dev'], country: 'NZ' }),
      /Apify Zeil actor returned 500/
    )
  })

  test('returns empty array when Apify returns empty', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const scraper = new ZeilJobScraper()
    Object.defineProperty(scraper, 'apiToken', { value: 'test-token', writable: false })

    const result = await scraper.scrape({ roles: ['Niche Role'], country: 'NZ' })
    assert.isArray(result)
    assert.lengthOf(result, 0)
  })
})
