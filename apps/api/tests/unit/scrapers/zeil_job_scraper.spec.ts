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

  test('throws error when Playwright server is not configured', async ({ assert }) => {
    const scraper = new ZeilJobScraper()
    if (!scraper.isConfigured) {
      await assert.rejects(
        () => scraper.scrape({ roles: ['Dev'], country: 'NZ' }),
        'PLAYWRIGHT_SERVER_URL or PLAYWRIGHT_SERVER_TOKEN is not configured'
      )
    }
  })

  test('returns RawJobOffer[] from Playwright Zeil scraper', async ({ assert }) => {
    // ORACLE: Zeil Playwright scraper returns job data → RawJobOffer with platform='zeil'
    // Mock data mirrors real n8n workflow bQq2XdV0qrJGisGl output shape
    let callCount = 0
    globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      callCount++
      const body = JSON.parse((init?.body as string) ?? '{}')

      if (body.tool === 'navigate') {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (body.tool === 'evaluate') {
        return new Response(
          JSON.stringify({
            success: true,
            result: [
              {
                company_name: 'Theta',
                role: 'Software Architect (.NET & Azure)',
                posted_at: 'Posted 3d ago',
                id: '500c4987-87f5-4c98-91e8-bd2df0dca10c',
                content: 'Hybrid • Full Time\n Auckland\n Lead the evolution of a mission-critical .NET ecosystem',
                jobLink: 'https://www.zeil.com/jobs/job/aphfa',
                hard_skills: ['Leadership', 'Angular', 'Architecture'],
                soft_skills: ['Collaboration', 'Mentoring'],
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (body.tool === 'close_session') {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response('Unknown tool', { status: 400 })
    }

    const scraper = new ZeilJobScraper()
    Object.defineProperty(scraper, 'serverUrl', { value: 'https://playwright.test', writable: false })
    Object.defineProperty(scraper, 'serverToken', { value: 'test-token', writable: false })

    const result = await scraper.scrape({ roles: ['Frontend Developer'], country: 'NZ', city: 'Auckland' })

    assert.isArray(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0].platform, 'zeil')
    assert.equal(result[0].title, 'Software Architect (.NET & Azure)')
    assert.equal(result[0].company, 'Theta')
    assert.equal(result[0].externalId, '500c4987-87f5-4c98-91e8-bd2df0dca10c')
    assert.equal(result[0].url, 'https://www.zeil.com/jobs/job/aphfa')
    assert.equal(result[0].applyUrl, 'https://app.zeil.com/app/candidate/job/500c4987-87f5-4c98-91e8-bd2df0dca10c/apply')
    assert.equal(result[0].remoteType, 'hybrid')
    assert.isNull(result[0].salaryMin)
    assert.isNull(result[0].salaryMax)
    assert.isNull(result[0].contactEmail)
    // ORACLE: 3 calls: navigate + evaluate + close_session
    assert.equal(callCount, 3)
  })

  test('throws error when Playwright server returns error', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response('Error', { status: 500 })

    const scraper = new ZeilJobScraper()
    Object.defineProperty(scraper, 'serverUrl', { value: 'https://playwright.test', writable: false })
    Object.defineProperty(scraper, 'serverToken', { value: 'test-token', writable: false })

    await assert.rejects(
      () => scraper.scrape({ roles: ['Dev'], country: 'NZ' }),
      /Playwright server returned 500/
    )
  })

  test('returns empty array when no jobs are found', async ({ assert }) => {
    globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) ?? '{}')

      if (body.tool === 'navigate') {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (body.tool === 'evaluate') {
        return new Response(
          JSON.stringify({ success: true, result: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (body.tool === 'close_session') {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response('Unknown tool', { status: 400 })
    }

    const scraper = new ZeilJobScraper()
    Object.defineProperty(scraper, 'serverUrl', { value: 'https://playwright.test', writable: false })
    Object.defineProperty(scraper, 'serverToken', { value: 'test-token', writable: false })

    const result = await scraper.scrape({ roles: ['Niche Role'], country: 'NZ' })
    assert.isArray(result)
    assert.lengthOf(result, 0)
  })

  test('filters out error entries from scrape results', async ({ assert }) => {
    // ORACLE: jobs with "error" key should be filtered out
    globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) ?? '{}')

      if (body.tool === 'navigate') {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (body.tool === 'evaluate') {
        return new Response(
          JSON.stringify({
            success: true,
            result: [
              {
                company_name: 'Good Co',
                role: 'Dev',
                posted_at: 'Posted 1d ago',
                id: 'abc-123',
                content: 'A good job',
                jobLink: 'https://www.zeil.com/jobs/job/abc',
                hard_skills: [],
                soft_skills: [],
              },
              { error: 'Failed to fetch', url: 'https://www.zeil.com/jobs/job/broken' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (body.tool === 'close_session') {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response('Unknown tool', { status: 400 })
    }

    const scraper = new ZeilJobScraper()
    Object.defineProperty(scraper, 'serverUrl', { value: 'https://playwright.test', writable: false })
    Object.defineProperty(scraper, 'serverToken', { value: 'test-token', writable: false })

    const result = await scraper.scrape({ roles: ['Dev'], country: 'NZ' })
    // ORACLE: 2 results from evaluate, 1 has error → only 1 valid job returned
    assert.lengthOf(result, 1)
    assert.equal(result[0].company, 'Good Co')
  })
})
