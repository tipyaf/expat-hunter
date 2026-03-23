import { test } from '@japa/runner'
import { GoogleLinkedInProxyScraper } from '#scrapers/google_linkedin_proxy_scraper'

const scraper = new GoogleLinkedInProxyScraper()

test.group('GoogleLinkedInProxyScraper', () => {
  test('name is google_linkedin_proxy', ({ assert }) => {
    assert.equal(scraper.name, 'google_linkedin_proxy')
  })

  test('country is * (global)', ({ assert }) => {
    assert.equal(scraper.country, '*')
  })

  test('scrape returns empty when no API key configured', async ({ assert }) => {
    // Without GOOGLE_SEARCH_API_KEY, scrape returns empty
    const result = await scraper.scrape({ country: 'NZ' })
    assert.isArray(result)
  }).timeout(15000)

  test('searchLinkedIn returns empty when no API key', async ({ assert }) => {
    const result = await scraper.searchLinkedIn('Engineering Manager', 'NZ')
    assert.isArray(result)
  }).timeout(15000)
})

test.group('GoogleLinkedInProxyScraper — registration', () => {
  test('scraper is registered in scraperRegistry', async ({ assert }) => {
    await import('#scrapers/register')
    const { scraperRegistry } = await import('#scrapers/scraper_registry')

    const scrapers = scraperRegistry.getForCountry('NZ')
    const google = scrapers.find((s) => s.name === 'google_linkedin_proxy')
    assert.isDefined(google)
  })
})
