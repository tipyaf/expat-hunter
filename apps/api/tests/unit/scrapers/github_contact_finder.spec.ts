import { test } from '@japa/runner'
import { GitHubContactFinder } from '#scrapers/github_contact_finder'

const finder = new GitHubContactFinder()

test.group('GitHubContactFinder', () => {
  test('name is github_contact_finder', ({ assert }) => {
    assert.equal(finder.name, 'github_contact_finder')
  })

  test('country is * (global)', ({ assert }) => {
    assert.equal(finder.country, '*')
  })

  test('scrape returns array (may be empty without token)', async ({ assert }) => {
    const result = await finder.scrape({ country: 'NZ', maxResults: 5 })
    assert.isArray(result)
  }).timeout(30000)

  test('searchByLocation returns users with valid structure', async ({ assert }) => {
    const users = await finder.searchByLocation('Auckland')
    assert.isArray(users)

    if (users.length === 0) return // no GitHub token — skip

    const first = users[0]
    assert.isDefined(first.login)
    assert.isDefined(first.html_url)
  }).timeout(30000)
})

test.group('GitHubContactFinder — registration', () => {
  test('scraper is registered in scraperRegistry', async ({ assert }) => {
    await import('#scrapers/register')
    const { scraperRegistry } = await import('#scrapers/scraper_registry')

    const scrapers = scraperRegistry.getForCountry('NZ')
    const github = scrapers.find((s) => s.name === 'github_contact_finder')
    assert.isDefined(github)
  })
})
