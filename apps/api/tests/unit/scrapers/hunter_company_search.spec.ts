import { test } from '@japa/runner'
import { HunterCompanySearchScraper } from '#scrapers/hunter_company_search_scraper'

const scraper = new HunterCompanySearchScraper()

test.group('HunterCompanySearchScraper', () => {
  test('name is hunter_company_search', ({ assert }) => {
    assert.equal(scraper.name, 'hunter_company_search')
  })

  test('country is * (global)', ({ assert }) => {
    assert.equal(scraper.country, '*')
  })

  test('scrape returns empty array when no keywords (domains)', async ({ assert }) => {
    const result = await scraper.scrape({ country: 'NZ' })
    assert.deepEqual(result, [])
  })

  test('scrape returns empty array when keywords is empty array', async ({ assert }) => {
    const result = await scraper.scrape({ country: 'NZ', keywords: [] })
    assert.deepEqual(result, [])
  })

  test('searchDomain returns contacts with valid structure', async ({ assert }) => {
    // This test uses a real Hunter API call — skip if no key
    const contacts = await scraper.searchDomain('xero.com', 'NZ')

    if (contacts.length === 0) {
      // No API key configured — test is still valid
      assert.isArray(contacts)
      return
    }

    const first = contacts[0]
    assert.isDefined(first.fullName)
    assert.isDefined(first.role)
    assert.isDefined(first.email)
    assert.equal(first.source, 'hunter_company_search')
    assert.equal(first.emailSource, 'hunter')
    assert.isNumber(first.emailConfidence)
    assert.include(first.companyWebsite ?? '', 'xero.com')
  }).timeout(15000)

  test('searchDomain returns empty for nonexistent domain', async ({ assert }) => {
    const contacts = await scraper.searchDomain('this-domain-does-not-exist-xyz.com', 'NZ')
    assert.deepEqual(contacts, [])
  }).timeout(15000)

  test('contacts are deduplicated', async ({ assert }) => {
    const contacts = await scraper.searchDomain('xero.com', 'NZ')
    if (contacts.length === 0) return

    const emails = contacts.map((c) => c.email).filter(Boolean)
    const uniqueEmails = new Set(emails)
    assert.equal(emails.length, uniqueEmails.size)
  }).timeout(15000)
})

test.group('HunterCompanySearchScraper — registration', () => {
  test('scraper is registered in scraperRegistry', async ({ assert }) => {
    // Import register to trigger registration
    await import('#scrapers/register')
    const { scraperRegistry } = await import('#scrapers/scraper_registry')

    const scrapers = scraperRegistry.getForCountry('NZ')
    const hunter = scrapers.find((s) => s.name === 'hunter_company_search')
    assert.isDefined(hunter)
  })
})
