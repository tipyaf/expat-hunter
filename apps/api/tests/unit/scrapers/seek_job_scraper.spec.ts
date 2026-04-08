import { test } from '@japa/runner'
import { SeekJobScraper } from '../../../app/scrapers/seek_job_scraper.js'

// Mock fetch globally for Apify calls
const originalFetch = globalThis.fetch

test.group('SeekJobScraper', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('has correct name and platform', ({ assert }) => {
    const scraper = new SeekJobScraper()
    assert.equal(scraper.name, 'seek-jobs')
    assert.equal(scraper.platform, 'seek')
  })

  test('throws error when APIFY_TOKEN is not set', async ({ assert }) => {
    // In test env, APIFY_TOKEN is typically not set
    const scraper = new SeekJobScraper()
    if (!scraper.isConfigured) {
      await assert.rejects(
        () => scraper.scrape({ roles: ['Dev'], country: 'NZ' }),
        'APIFY_TOKEN is not configured'
      )
    }
  })

  test('returns RawJobOffer[] from Apify Seek actor', async ({ assert }) => {
    // ORACLE: Apify returns a Seek result → we expect a RawJobOffer with platform='seek'
    const mockItems = [
      {
        title: 'Senior Frontend Developer',
        advertiser: { name: 'Acme Corp' },
        companyProfile: { name: 'Acme Corp' },
        joblocationInfo: { displayLocation: 'Auckland, NZ', location: 'Auckland' },
        jobLink: 'https://www.seek.co.nz/job/12345',
        salary: '$120,000 - $150,000',
        workTypes: 'Full Time, Remote',
        description: 'Great role for a senior dev',
        emails: ['hr@acme.co.nz'],
      },
    ]

    globalThis.fetch = async () =>
      new Response(JSON.stringify(mockItems), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const scraper = new SeekJobScraper()
    // Force the token to be set for this test
    Object.defineProperty(scraper, 'apiToken', { value: 'test-token', writable: false })

    const result = await scraper.scrape({ roles: ['Senior Frontend'], country: 'NZ', city: 'Auckland' })

    assert.isArray(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0].platform, 'seek')
    assert.equal(result[0].title, 'Senior Frontend Developer')
    assert.equal(result[0].company, 'Acme Corp')
    assert.equal(result[0].location, 'Auckland, NZ')
    assert.isTrue(result[0].url.startsWith('https://'))
    assert.equal(result[0].externalId, '12345')
    // ORACLE: salary "$120,000 - $150,000" → min=120000, max=150000
    assert.equal(result[0].salaryMin, 120000)
    assert.equal(result[0].salaryMax, 150000)
    assert.equal(result[0].remoteType, 'remote')
    assert.equal(result[0].contactEmail, 'hr@acme.co.nz')
  })

  test('returns empty array when Apify returns empty results', async ({ assert }) => {
    // ORACLE: empty Apify response → empty array
    globalThis.fetch = async () =>
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const scraper = new SeekJobScraper()
    Object.defineProperty(scraper, 'apiToken', { value: 'test-token', writable: false })

    const result = await scraper.scrape({ roles: ['Underwater Basket Weaver'], country: 'NZ' })
    assert.isArray(result)
    assert.lengthOf(result, 0)
  })

  test('throws error when Apify returns 500', async ({ assert }) => {
    // ORACLE: Apify 500 → throws Error
    globalThis.fetch = async () =>
      new Response('Internal Server Error', { status: 500 })

    const scraper = new SeekJobScraper()
    Object.defineProperty(scraper, 'apiToken', { value: 'test-token', writable: false })

    await assert.rejects(
      () => scraper.scrape({ roles: ['Dev'], country: 'NZ' }),
      /Apify Seek actor returned 500/
    )
  })

  test('handles missing optional fields gracefully', async ({ assert }) => {
    // ORACLE: item with minimal fields → RawJobOffer with nulls for optional fields
    const mockItems = [
      {
        title: 'Developer',
        advertiser: { name: 'SomeCompany' },
      },
    ]

    globalThis.fetch = async () =>
      new Response(JSON.stringify(mockItems), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const scraper = new SeekJobScraper()
    Object.defineProperty(scraper, 'apiToken', { value: 'test-token', writable: false })

    const result = await scraper.scrape({ roles: ['Dev'], country: 'NZ' })
    assert.lengthOf(result, 1)
    assert.equal(result[0].title, 'Developer')
    assert.equal(result[0].company, 'SomeCompany')
    assert.isNull(result[0].salaryMin)
    assert.isNull(result[0].salaryMax)
    assert.isNull(result[0].remoteType)
    assert.isNull(result[0].contactEmail)
  })
})
