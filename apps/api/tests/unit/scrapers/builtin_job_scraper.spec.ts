import { test } from '@japa/runner'
import { BuiltInJobScraper } from '../../../app/scrapers/builtin_job_scraper.js'

const originalFetch = globalThis.fetch

test.group('BuiltInJobScraper', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('has correct name and platform', ({ assert }) => {
    const scraper = new BuiltInJobScraper()
    assert.equal(scraper.name, 'builtin-jobs')
    assert.equal(scraper.platform, 'builtin')
  })

  test('throws error when APIFY_TOKEN is not set', async ({ assert }) => {
    const scraper = new BuiltInJobScraper()
    if (!scraper.isConfigured) {
      await assert.rejects(
        () => scraper.scrape({ roles: ['Dev'], country: 'US' }),
        'APIFY_TOKEN is not configured'
      )
    }
  })

  test('returns RawJobOffer[] from Apify BuiltIn actor', async ({ assert }) => {
    // ORACLE: BuiltIn result → RawJobOffer with platform='builtin'
    const mockItems = [
      {
        title: 'React Engineer',
        company_name: 'TechStartup Inc',
        location: 'San Francisco, CA',
        url: 'https://builtin.com/job/react-engineer-456',
        id: '456',
        salary: '$130,000 - $170,000',
        description: 'Join our team',
        remote_type: 'Hybrid',
        apply_url: 'https://builtin.com/apply/456',
      },
    ]

    globalThis.fetch = async () =>
      new Response(JSON.stringify(mockItems), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const scraper = new BuiltInJobScraper()
    Object.defineProperty(scraper, 'apiToken', { value: 'test-token', writable: false })

    const result = await scraper.scrape({ roles: ['React Engineer'], country: 'US' })

    assert.isArray(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0].platform, 'builtin')
    assert.equal(result[0].title, 'React Engineer')
    assert.equal(result[0].company, 'TechStartup Inc')
    assert.equal(result[0].externalId, '456')
    // ORACLE: "$130,000 - $170,000" → min=130000, max=170000
    assert.equal(result[0].salaryMin, 130000)
    assert.equal(result[0].salaryMax, 170000)
    assert.equal(result[0].remoteType, 'hybrid')
  })

  test('throws error when Apify returns error', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response('Error', { status: 500 })

    const scraper = new BuiltInJobScraper()
    Object.defineProperty(scraper, 'apiToken', { value: 'test-token', writable: false })

    await assert.rejects(
      () => scraper.scrape({ roles: ['Dev'], country: 'US' }),
      /Apify BuiltIn actor returned 500/
    )
  })

  test('returns empty array when Apify returns empty', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const scraper = new BuiltInJobScraper()
    Object.defineProperty(scraper, 'apiToken', { value: 'test-token', writable: false })

    const result = await scraper.scrape({ roles: ['Niche Role'], country: 'US' })
    assert.isArray(result)
    assert.lengthOf(result, 0)
  })
})
