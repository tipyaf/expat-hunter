import { test } from '@japa/runner'
import { LinkedInJobScraper } from '../../../app/scrapers/linkedin_job_scraper.js'

const originalFetch = globalThis.fetch

test.group('LinkedInJobScraper', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('has correct name and platform', ({ assert }) => {
    const scraper = new LinkedInJobScraper()
    assert.equal(scraper.name, 'linkedin-jobs')
    assert.equal(scraper.platform, 'linkedin')
  })

  test('uses Apify actor (never in-house Playwright)', ({ assert }) => {
    // ORACLE: LinkedInJobScraper must use Apify — verify no Playwright import
    const scraperSource = LinkedInJobScraper.toString()
    assert.notInclude(scraperSource, 'playwright')
    assert.notInclude(scraperSource, 'Playwright')
  })

  test('throws error when APIFY_TOKEN is not set', async ({ assert }) => {
    const scraper = new LinkedInJobScraper()
    if (!scraper.isConfigured) {
      await assert.rejects(
        () => scraper.scrape({ roles: ['Dev'], country: 'NZ' }),
        'APIFY_TOKEN is not configured'
      )
    }
  })

  test('returns RawJobOffer[] from Apify LinkedIn actor', async ({ assert }) => {
    // ORACLE: LinkedIn result → RawJobOffer with platform='linkedin'
    // Mock data mirrors real Apify `ivanvs~linkedin-job-scraper` response shape
    const mockItems = [
      {
        id: 123456,
        title: 'Backend Engineer',
        description: 'Backend role with Node.js',
        url: 'https://linkedin.com/jobs/view/123456',
        applyUrl: 'https://linkedin.com/jobs/apply/123456',
        company: { name: 'GlobalCorp', url: 'https://globalcorp.com' },
        location: { city: 'Auckland', country: 'New Zealand' },
        datePosted: '2026-04-01',
        isClosed: false,
      },
    ]

    globalThis.fetch = async () =>
      new Response(JSON.stringify(mockItems), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const scraper = new LinkedInJobScraper()
    Object.defineProperty(scraper, 'apiToken', { value: 'test-token', writable: false })

    const result = await scraper.scrape({ roles: ['Backend Engineer'], country: 'NZ', city: 'Auckland' })

    assert.isArray(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0].platform, 'linkedin')
    assert.equal(result[0].title, 'Backend Engineer')
    assert.equal(result[0].company, 'GlobalCorp')
    assert.equal(result[0].externalId, '123456')
    assert.equal(result[0].location, 'Auckland, New Zealand')
    // LinkedIn actor does not return salary data
    assert.isNull(result[0].salaryMin)
    assert.isNull(result[0].salaryMax)
    assert.isNull(result[0].remoteType)
    assert.equal(result[0].applyUrl, 'https://linkedin.com/jobs/apply/123456')
    assert.equal(result[0].description, 'Backend role with Node.js')
  })

  test('throws error when Apify returns error', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response('Error', { status: 500 })

    const scraper = new LinkedInJobScraper()
    Object.defineProperty(scraper, 'apiToken', { value: 'test-token', writable: false })

    await assert.rejects(
      () => scraper.scrape({ roles: ['Dev'], country: 'NZ' }),
      /Apify LinkedIn actor returned 500/
    )
  })

  test('returns empty array when Apify returns empty', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const scraper = new LinkedInJobScraper()
    Object.defineProperty(scraper, 'apiToken', { value: 'test-token', writable: false })

    const result = await scraper.scrape({ roles: ['Niche'], country: 'NZ' })
    assert.isArray(result)
    assert.lengthOf(result, 0)
  })
})
