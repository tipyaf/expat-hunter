import type { HttpContext } from '@adonisjs/core/http'
import Contact from '#models/contact'
import Company from '#models/company'
import EmailEnricher from '#services/email_enricher'
import CompanyEnricher from '#services/company_enricher'
import VisaSponsorRegistryService from '#services/visa_sponsor_registry'

export default class EnrichmentController {
  /**
   * POST /api/contacts/:id/enrich-email
   * Enrich a single contact's email using Hunter → Apollo → inference.
   */
  async enrichEmail({ params, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const contact = await Contact.query()
      .where('id', params.id)
      .where('userId', user.id)
      .preload('company')
      .firstOrFail()

    if (contact.email && contact.emailStatus === 'verified') {
      return response.ok({ message: 'Email already verified', contact: this.serialize(contact) })
    }

    const enricher = new EmailEnricher()
    const domain =
      contact.company?.domain ?? enricher.extractDomain(contact.company?.website ?? '')

    if (!domain) {
      return response.unprocessableEntity({ error: 'No domain available for enrichment' })
    }

    const result = await enricher.enrich(contact.fullName, domain)

    if (result.email) {
      contact.email = result.email
      contact.emailSource = result.source
      contact.emailConfidence = result.confidence
      contact.emailStatus = result.status
      contact.emailAlternatives = result.alternatives.length > 0 ? result.alternatives : null
      await contact.save()
    }

    return response.ok({ enriched: !!result.email, result, contact: this.serialize(contact) })
  }

  /**
   * POST /api/contacts/enrich-email-batch
   * Enrich emails for multiple contacts (max 50 per call).
   */
  async enrichEmailBatch({ request, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { contactIds } = request.only(['contactIds']) as { contactIds: string[] }

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return response.badRequest({ error: 'contactIds must be a non-empty array' })
    }

    const MAX_BATCH_SIZE = 50
    const ids = contactIds.slice(0, MAX_BATCH_SIZE)
    const contacts = await Contact.query()
      .whereIn('id', ids)
      .where('userId', user.id)
      .preload('company')

    const enricher = new EmailEnricher()
    const results = await enricher.enrichBatch(contacts)

    const enrichedCount = results.filter((r) => r.enriched).length
    return response.ok({ total: results.length, enriched: enrichedCount, results })
  }

  /**
   * POST /api/sourcing/enrich-company/:id
   * Trigger CompanyEnricher for a specific company (crawl team pages).
   */
  async enrichCompany({ params, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const company = await Company.findOrFail(params.id)

    // Verify the user has at least one contact in this company
    const contact = await Contact.query()
      .where('userId', user.id)
      .where('companyId', company.id)
      .first()

    if (!contact) {
      return response.forbidden({ error: 'No access to this company' })
    }

    if (company.teamCrawledAt) {
      return response.ok({ message: 'Company already crawled', crawledAt: company.teamCrawledAt })
    }

    const enricher = new CompanyEnricher()
    const result = await enricher.enrichCompany(company, user.id, null)

    return response.ok({
      companyId: company.id,
      teamMembersFound: result.teamMembers.length,
      crawledUrls: result.crawledUrls,
      errors: result.errors,
    })
  }

  /**
   * POST /api/admin/refresh-visa-registries
   * Refresh visa sponsor registries from government sources (admin only).
   */
  async refreshVisaRegistries({ request, response }: HttpContext) {
    const { countries } = request.only(['countries']) as {
      countries?: ('NZ' | 'UK' | 'AU')[]
    }

    const toRefresh = countries ?? (['NZ', 'UK', 'AU'] as const)
    const registry = new VisaSponsorRegistryService()
    const results: Record<string, { count: number; error?: string }> = {}

    for (const country of toRefresh) {
      try {
        const count = await registry.refreshRegistry(country as 'NZ' | 'UK' | 'AU')
        results[country] = { count }
      } catch (err) {
        results[country] = {
          count: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }
    }

    return response.ok({ results })
  }

  /**
   * GET /api/settings/enrichment-quotas
   * Returns remaining Hunter/Apollo quota info (from cache stats).
   */
  async quotas({ response }: HttpContext) {
    const hunterConfigured = !!process.env.HUNTER_API_KEY
    const apolloConfigured = !!process.env.APOLLO_API_KEY

    return response.ok({
      hunter: { configured: hunterConfigured },
      apollo: { configured: apolloConfigured },
    })
  }

  private serialize(contact: Contact) {
    return {
      id: contact.id,
      email: contact.email,
      emailSource: contact.emailSource,
      emailConfidence: contact.emailConfidence,
      emailStatus: contact.emailStatus,
    }
  }
}
