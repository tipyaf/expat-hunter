import { test } from '@japa/runner'
import { BaseScraper, type RawContact, type ScrapeParams } from '../../../app/scrapers/base_scraper.js'

class TestScraper extends BaseScraper {
  readonly name = 'test'
  readonly country = 'NZ'

  async scrape(_params: ScrapeParams): Promise<RawContact[]> {
    return []
  }

  // Expose protected methods for testing
  testDeduplicateContacts(contacts: RawContact[]) {
    return this.deduplicateContacts(contacts)
  }

  testRandomUserAgent() {
    return this.randomUserAgent()
  }
}

test.group('BaseScraper', () => {
  test('deduplicateContacts removes duplicates by email', ({ assert }) => {
    const scraper = new TestScraper()

    const contacts: RawContact[] = [
      { fullName: 'Alice', role: 'Dev', email: 'alice@co.nz', companyName: 'Co A', companyCountry: 'NZ', source: 'test' },
      { fullName: 'Alice Dup', role: 'Dev', email: 'alice@co.nz', companyName: 'Co A', companyCountry: 'NZ', source: 'test' },
      { fullName: 'Bob', role: 'PM', email: 'bob@co.nz', companyName: 'Co B', companyCountry: 'NZ', source: 'test' },
    ]

    const result = scraper.testDeduplicateContacts(contacts)
    assert.lengthOf(result, 2)
    assert.equal(result[0].fullName, 'Alice')
    assert.equal(result[1].fullName, 'Bob')
  })

  test('deduplicateContacts removes duplicates by linkedinUrl', ({ assert }) => {
    const scraper = new TestScraper()

    const contacts: RawContact[] = [
      { fullName: 'A', role: 'Dev', linkedinUrl: 'https://linkedin.com/in/alice', companyName: 'Co', companyCountry: 'NZ', source: 'test' },
      { fullName: 'A dup', role: 'Dev', linkedinUrl: 'https://linkedin.com/in/alice', companyName: 'Co', companyCountry: 'NZ', source: 'test' },
    ]

    const result = scraper.testDeduplicateContacts(contacts)
    assert.lengthOf(result, 1)
  })

  test('deduplicateContacts uses fullName::companyName as fallback key', ({ assert }) => {
    const scraper = new TestScraper()

    const contacts: RawContact[] = [
      { fullName: 'Hiring Manager', role: 'Dev', companyName: 'Acme', companyCountry: 'NZ', source: 'test' },
      { fullName: 'Hiring Manager', role: 'PM', companyName: 'Acme', companyCountry: 'NZ', source: 'test' },
      { fullName: 'Hiring Manager', role: 'Dev', companyName: 'Other', companyCountry: 'NZ', source: 'test' },
    ]

    const result = scraper.testDeduplicateContacts(contacts)
    assert.lengthOf(result, 2)
  })

  test('randomUserAgent returns a non-empty string', ({ assert }) => {
    const scraper = new TestScraper()
    const ua = scraper.testRandomUserAgent()
    assert.isString(ua)
    assert.isTrue(ua.length > 10)
  })
})
