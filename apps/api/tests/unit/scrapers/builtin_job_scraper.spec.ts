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
    // Mock data mirrors real Apify `shahidirfan~builtin-jobs-scraper` response shape
    const mockItems = [
      {
        title: 'React Engineer',
        company: 'TechStartup Inc',
        category: 'Software Engineering',
        location: 'Auckland, Auckland, NZL',
        date_posted: '2026-03-16',
        description_html: '<p>Join our team</p>',
        description_text: 'Join our team',
        hiring_remote_in: '',
        workplace_type: 'Hybrid',
        salary_range_short: '$130,000 - $170,000',
        seniority: 'Mid-Level',
        workplace_type_enum: 'HYBRID',
        company_overview: 'A tech startup',
        url: 'https://builtin.com/job/react-engineer/8381456',
        source: 'builtin.com',
      },
    ]

    globalThis.fetch = async () =>
      new Response(JSON.stringify(mockItems), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const scraper = new BuiltInJobScraper()
    Object.defineProperty(scraper, 'apiToken', { value: 'test-token', writable: false })

    const result = await scraper.scrape({ roles: ['React Engineer'], country: 'NZL' })

    assert.isArray(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0].platform, 'builtin')
    assert.equal(result[0].title, 'React Engineer')
    assert.equal(result[0].company, 'TechStartup Inc')
    // ORACLE: URL ends with "8381456" → externalId = "BN-8381456"
    assert.equal(result[0].externalId, 'BN-8381456')
    // ORACLE: "$130,000 - $170,000" → min=130000, max=170000
    assert.equal(result[0].salaryMin, 130000)
    assert.equal(result[0].salaryMax, 170000)
    assert.equal(result[0].remoteType, 'hybrid')
    assert.equal(result[0].description, 'Join our team')
    assert.equal(result[0].location, 'Auckland, Auckland, NZL')
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
