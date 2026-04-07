import type { HttpContext } from '@adonisjs/core/http'
import SourcingService from '#services/sourcing_service'
import SourcingOrchestrator from '#services/sourcing_orchestrator'
import UsageService from '#services/usage_service'
// Register scrapers on first import
import '../scrapers/register.js'

export default class SourcingController {
  private readonly sourcingService = new SourcingService()
  private readonly orchestrator = new SourcingOrchestrator()
  private readonly usageService = new UsageService()

  /**
   * POST /api/sourcing/run — Launch a new sourcing campaign (5-phase pipeline).
   */
  async run({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { country, sector, sources } = request.only(['country', 'sector', 'sources'])

    if (!country || typeof country !== 'string' || country.length < 2) {
      return response.badRequest({
        error: { code: 'COUNTRY_REQUIRED', message: 'A valid country code is required (e.g. NZ, AU)' },
      })
    }

    // Quota check: searches
    const searchCheck = await this.usageService.checkQuota(user.id, user.plan, 'searches')
    if (!searchCheck.allowed) {
      return response.forbidden({
        error: { code: 'QUOTA_EXCEEDED', message: 'Search quota exceeded. Upgrade to Premium for unlimited searches.' },
        quota: searchCheck.quota,
      })
    }

    if (SourcingOrchestrator.isRunning(user.id)) {
      return response.conflict({
        error: { code: 'RUN_IN_PROGRESS', message: 'A sourcing run is already in progress' },
      })
    }

    const result = await this.orchestrator.run(
      user.id,
      country.toUpperCase(),
      sector ?? undefined,
      Array.isArray(sources) ? sources : undefined
    )

    // Increment search counter after successful run
    await this.usageService.increment(user.id, 'searches')
    const searchQuota = await this.usageService.getRemainingQuota(user.id, user.plan, 'searches')

    return response.ok({
      data: {
        ...this.serializeRun(result.run),
        phases: result.phases,
        qualifiedContacts: result.qualifiedContacts,
        emailVerified: result.emailVerified,
      },
      quota: searchQuota,
      message: `Sourcing completed: ${result.totalContacts} contacts, ${result.qualifiedContacts} qualified, ${result.emailVerified} verified`,
    })
  }

  /**
   * GET /api/sourcing/runs — List all sourcing runs for the user.
   */
  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const runs = await this.sourcingService.getRuns(user.id)

    return response.ok({
      data: runs.map((r) => this.serializeRun(r)),
    })
  }

  /**
   * GET /api/sourcing/runs/:id — Get a single run with its contacts.
   */
  async show({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()

    try {
      const run = await this.sourcingService.getRun(user.id, params.id)
      return response.ok({
        data: {
          ...this.serializeRun(run),
          contacts: run.contacts.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            role: c.role,
            email: c.email,
            linkedinUrl: c.linkedinUrl,
            source: c.source,
            status: c.status,
            company: c.company
              ? { id: c.company.id, name: c.company.name, country: c.company.country }
              : null,
          })),
        },
      })
    } catch {
      return response.notFound({
        error: { code: 'RUN_NOT_FOUND', message: 'Sourcing run not found' },
      })
    }
  }

  /**
   * GET /api/sourcing/sources — Get available sources for a country.
   */
  async sources({ auth, request, response }: HttpContext) {
    auth.getUserOrFail()
    const country = request.input('country', 'NZ')

    const sources = await this.sourcingService.getSourcesForCountry(country)

    return response.ok({
      data: sources.map((s) => ({
        id: s.id,
        name: s.name,
        country: s.country,
        enabled: s.enabled,
      })),
    })
  }

  private serializeRun(run: {
    id: string
    userId: string
    status: string
    country: string
    sector: string | null
    sources: string[]
    contactsFound: number
    startedAt: unknown
    completedAt: unknown
    errors: Record<string, unknown> | null
    createdAt: unknown
    updatedAt: unknown
  }) {
    return {
      id: run.id,
      userId: run.userId,
      status: run.status,
      country: run.country,
      sector: run.sector,
      sources: run.sources,
      contactsFound: run.contactsFound,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      errors: run.errors,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    }
  }
}
