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
    // Mock data mirrors real Apify `websift~seek-job-scraper` response shape
    const mockItems = [
      {
        id: '91333908',
        jobLink: 'https://nz.seek.com/job/91333908',
        applyLink: 'https://nz.seek.com/job/91333908/apply',
        isExternalApply: false,
        roleId: 'senior-frontend-developer',
        title: 'Senior Frontend Developer',
        salary: '$120,000 – $150,000 per year',
        content: {
          bulletPoints: 'N/A',
          jobHook: 'Great opportunity',
          unEditedContent: '<p>Great role for a senior dev</p>',
          sections: ['Senior Frontend Developer'],
        },
        numApplicants: 5,
        workArrangements: 'Remote',
        emails: ['hr@acme.co.nz'],
        workTypes: 'Full time',
        classificationInfo: { classification: 'ICT', subClassification: 'Engineering - Software' },
        joblocationInfo: {
          area: 'Auckland Central',
          displayLocation: 'Auckland, NZ',
          location: 'Auckland',
          country: 'New Zealand',
          countryCode: 'NZ',
          suburb: 'Central',
        },
        advertiser: {
          logo: 'https://example.com/logo.png',
          id: '123',
          name: 'Acme Corp',
          isVerified: true,
          isPrivate: 'N/A',
          registrationDate: '2020-01-01T00:00:00.000Z',
        },
        companyProfile: {
          id: null, name: 'Acme Corp', companyNameSlug: null,
          overview: 'N/A', industry: 'N/A', size: 'N/A', profile: 'N/A',
          website: 'N/A', numberOfReviews: 'N/A', rating: 'N/A', perksAndBenefits: null,
        },
        companyOpenJobs: 'https://nz.seek.com/Acme-Corp-jobs',
        companyTags: [],
        employerQuestions: [],
        employerVideo: 'N/A',
        listedAt: '2026-04-05T01:41:58.203Z',
        expiresAtUtc: '2026-05-05T13:59:59.999Z',
        isVerified: true,
        hasRoleRequirements: true,
      },
    ]

    globalThis.fetch = async () =>
      new Response(JSON.stringify(mockItems), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    const scraper = new SeekJobScraper()
    Object.defineProperty(scraper, 'apiToken', { value: 'test-token', writable: false })

    const result = await scraper.scrape({ roles: ['Senior Frontend'], country: 'NZ', city: 'Auckland' })

    assert.isArray(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0].platform, 'seek')
    assert.equal(result[0].title, 'Senior Frontend Developer')
    assert.equal(result[0].company, 'Acme Corp')
    assert.equal(result[0].location, 'Auckland, NZ')
    assert.equal(result[0].url, 'https://nz.seek.com/job/91333908')
    assert.equal(result[0].externalId, '91333908')
    // ORACLE: salary "$120,000 – $150,000 per year" → min=120000, max=150000
    assert.equal(result[0].salaryMin, 120000)
    assert.equal(result[0].salaryMax, 150000)
    assert.equal(result[0].remoteType, 'remote')
    assert.equal(result[0].contactEmail, 'hr@acme.co.nz')
    assert.equal(result[0].applyUrl, 'https://nz.seek.com/job/91333908/apply')
    assert.equal(result[0].closingDate, '2026-05-05T13:59:59.999Z')
    assert.equal(result[0].description, '<p>Great role for a senior dev</p>')
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

  test('handles empty salary and emails gracefully', async ({ assert }) => {
    // ORACLE: item with empty salary string and no emails → nulls for salary/contact
    const mockItems = [
      {
        id: '99999',
        jobLink: 'https://nz.seek.com/job/99999',
        applyLink: 'https://nz.seek.com/job/99999/apply',
        isExternalApply: false,
        roleId: 'developer',
        title: 'Developer',
        salary: '',
        content: {
          bulletPoints: 'N/A',
          jobHook: '',
          unEditedContent: 'Some description',
          sections: [],
        },
        numApplicants: 0,
        workArrangements: 'On-site',
        emails: [],
        workTypes: 'Full time',
        classificationInfo: { classification: 'ICT', subClassification: 'Software' },
        joblocationInfo: {
          area: 'Auckland', displayLocation: 'Auckland', location: 'Auckland',
          country: 'New Zealand', countryCode: 'NZ', suburb: '',
        },
        advertiser: {
          logo: '', id: '1', name: 'SomeCompany', isVerified: false,
          isPrivate: 'N/A', registrationDate: '2020-01-01T00:00:00.000Z',
        },
        companyProfile: {
          id: null, name: null, companyNameSlug: null,
          overview: 'N/A', industry: 'N/A', size: 'N/A', profile: 'N/A',
          website: 'N/A', numberOfReviews: 'N/A', rating: 'N/A', perksAndBenefits: null,
        },
        companyOpenJobs: '',
        companyTags: [],
        employerQuestions: [],
        employerVideo: 'N/A',
        listedAt: '2026-04-01T00:00:00.000Z',
        expiresAtUtc: '2026-05-01T00:00:00.000Z',
        isVerified: false,
        hasRoleRequirements: false,
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
    assert.equal(result[0].remoteType, 'onsite')
    assert.isNull(result[0].contactEmail)
  })
})
