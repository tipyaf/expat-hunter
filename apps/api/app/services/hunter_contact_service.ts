/**
 * HunterContactService — Finds named contacts at companies via Hunter.io domain search.
 *
 * Filters out job board domains and recruitment agencies.
 * Deduplicates by email within a user's contacts.
 */
import Contact from '#models/contact'
import logger from '@adonisjs/core/services/logger'
import { HunterCompanySearchScraper } from '../scrapers/hunter_company_search_scraper.js'

/**
 * Job board and recruitment agency domains to EXCLUDE from Hunter search.
 * These are NOT real employers — they are job listing aggregators.
 * Hunter returns their employees (HR people), not target hiring managers.
 */
export const JOB_BOARD_DOMAINS = new Set([
  'seek.co.nz', 'seek.com.au', 'indeed.com', 'nz.indeed.com', 'au.indeed.com',
  'linkedin.com', 'glassdoor.com', 'glassdoor.co.nz',
  'trademe.co.nz', 'jobs.govt.nz',
  'builtin.com', 'adecco.com', 'hays.net.nz', 'hays.com.au',
  'welovesalt.com', 'robertwalters.co.nz', 'roberthalf.co.nz',
  'michaelpage.co.nz', 'randstad.co.nz', 'manpower.com',
  'monster.com', 'ziprecruiter.com', 'adzuna.co.nz',
  'jora.com', 'careerjet.co.nz', 'simplyhired.co.nz',
  'workingin-newzealand.com', 'newzealandnow.govt.nz',
  'immigration.govt.nz', 'careers.govt.nz',
])

const HR_KEYWORDS = [
  'recruiter', 'recruitment', 'talent acquisition', 'human resources',
  'hr manager', 'hr director', 'people operations', 'hiring manager',
]

export interface HunterContactResult {
  added: number
}

export default class HunterContactService {
  /**
   * For each company found by sourcing, run Hunter domain search
   * to find real named contacts with emails. These replace the generic
   * "Hiring Manager" contacts from Seek.
   */
  async findNamedContactsViaHunter(
    userId: string,
    sourcingRunId: string,
    includeHr: boolean
  ): Promise<number> {
    const hunterScraper = new HunterCompanySearchScraper()
    let added = 0

    const companies = await Contact.query()
      .where('sourcingRunId', sourcingRunId)
      .preload('company')
      .select('companyId')
      .groupBy('companyId')

    const seenCompanyIds = new Set<string>()

    for (const contact of companies) {
      const company = contact.company
      if (!company?.domain || seenCompanyIds.has(company.id)) continue
      seenCompanyIds.add(company.id)

      if (JOB_BOARD_DOMAINS.has(company.domain)) {
        logger.info('Skipping job board domain: %s', company.domain)
        continue
      }

      try {
        const hunterContacts = await hunterScraper.searchDomain(company.domain, company.country)

        for (const raw of hunterContacts) {
          if (!this.isValidContact(raw, includeHr)) continue

          const email = raw.email!
          const existing = await Contact.query()
            .where('userId', userId)
            .where('email', email)
            .first()
          if (existing) continue

          await Contact.create({
            userId,
            companyId: company.id,
            sourcingRunId,
            fullName: raw.fullName,
            role: raw.role ?? 'Unknown',
            email,
            source: raw.source,
            sourceDetail: raw.sourceDetail ?? null,
            emailSource: 'hunter',
            emailConfidence: raw.emailConfidence ?? 90,
            emailStatus: 'probable',
            status: 'identified',
          })
          added++
        }
      } catch (error) {
        logger.warn(
          'Hunter search failed for %s: %s',
          company.domain,
          error instanceof Error ? error.message : 'Unknown'
        )
      }
    }

    return added
  }

  private isValidContact(
    raw: { fullName: string; email?: string; role?: string },
    includeHr: boolean
  ): boolean {
    const name = raw.fullName.toLowerCase().trim()
    if (!name || name === 'hiring manager' || name === 'contact' || name === 'unknown') return false
    if (!raw.email) return false

    if (!includeHr && raw.role) {
      const roleLower = raw.role.toLowerCase()
      if (HR_KEYWORDS.some((kw) => roleLower.includes(kw))) return false
    }

    return true
  }
}
