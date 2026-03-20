import { test } from '@japa/runner'
import { BaseScraper, type RawContact, type ScrapeParams } from '../../../app/scrapers/base_scraper.js'
import { ScraperRegistry } from '../../../app/scrapers/scraper_registry.js'

class FakeScraper extends BaseScraper {
  constructor(
    public readonly name: string,
    public readonly country: string,
  ) {
    super()
  }

  async scrape(_params: ScrapeParams): Promise<RawContact[]> {
    return []
  }
}

test.group('ScraperRegistry', () => {
  test('register and retrieve by country', ({ assert }) => {
    const registry = new ScraperRegistry()
    const seekNZ = new FakeScraper('seek', 'NZ')
    const seekAU = new FakeScraper('seek', 'AU')

    registry.register(seekNZ)
    registry.register(seekAU)

    const nzScrapers = registry.getForCountry('NZ')
    assert.lengthOf(nzScrapers, 1)
    assert.equal(nzScrapers[0].name, 'seek')
    assert.equal(nzScrapers[0].country, 'NZ')
  })

  test('global scrapers are included for all countries', ({ assert }) => {
    const registry = new ScraperRegistry()
    const seekNZ = new FakeScraper('seek', 'NZ')
    const apify = new FakeScraper('apify', '*')

    registry.register(seekNZ)
    registry.register(apify)

    const nzScrapers = registry.getForCountry('NZ')
    assert.lengthOf(nzScrapers, 2)

    const frScrapers = registry.getForCountry('FR')
    assert.lengthOf(frScrapers, 1)
    assert.equal(frScrapers[0].name, 'apify')
  })

  test('getByName finds correct scraper', ({ assert }) => {
    const registry = new ScraperRegistry()
    registry.register(new FakeScraper('seek', 'NZ'))
    registry.register(new FakeScraper('apify', '*'))

    const seek = registry.getByName('seek', 'NZ')
    assert.isDefined(seek)
    assert.equal(seek!.name, 'seek')

    const apify = registry.getByName('apify', 'FR')
    assert.isDefined(apify)
    assert.equal(apify!.name, 'apify')
  })

  test('getByName returns undefined for non-existent scraper', ({ assert }) => {
    const registry = new ScraperRegistry()
    registry.register(new FakeScraper('seek', 'NZ'))

    const result = registry.getByName('indeed', 'NZ')
    assert.isUndefined(result)
  })

  test('getAll returns all registered scrapers', ({ assert }) => {
    const registry = new ScraperRegistry()
    registry.register(new FakeScraper('seek', 'NZ'))
    registry.register(new FakeScraper('seek', 'AU'))
    registry.register(new FakeScraper('apify', '*'))

    assert.lengthOf(registry.getAll(), 3)
  })
})
