import { BaseSeeder } from '@adonisjs/lucid/seeders'
import SourcingSource from '#models/sourcing_source'

export default class extends BaseSeeder {
  async run() {
    await SourcingSource.updateOrCreateMany(['name', 'country'], [
      // New Zealand
      {
        name: 'seek',
        country: 'NZ',
        baseUrl: 'https://www.seek.co.nz',
        scraperClass: 'SeekScraper',
        enabled: true,
        config: { rateLimit: 2000 },
      },
      {
        name: 'matchstiq',
        country: 'NZ',
        baseUrl: 'https://matchstiq.io',
        scraperClass: 'MatchstiqScraper',
        enabled: false,
        config: null,
      },
      {
        name: 'zeil',
        country: 'NZ',
        baseUrl: 'https://www.zeil.co.nz',
        scraperClass: 'ZeilScraper',
        enabled: false,
        config: null,
      },
      // Australia
      {
        name: 'seek',
        country: 'AU',
        baseUrl: 'https://www.seek.com.au',
        scraperClass: 'SeekScraper',
        enabled: true,
        config: { rateLimit: 2000 },
      },
      // Global
      {
        name: 'linkedin',
        country: '*',
        baseUrl: 'https://www.linkedin.com',
        scraperClass: 'LinkedinScraper',
        enabled: false,
        config: null,
      },
      {
        name: 'apify',
        country: '*',
        baseUrl: 'https://api.apify.com',
        scraperClass: 'ApifyFallback',
        enabled: true,
        config: null,
      },
    ])
  }
}
