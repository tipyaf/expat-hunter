import type { HttpContext } from '@adonisjs/core/http'
import SearchOrchestratorService from '#services/search_orchestrator_service'
// Register scrapers on first import
import '../scrapers/register.js'

export default class SearchController {
  private searchService = new SearchOrchestratorService()

  /**
   * POST /api/recherche — Launch the full automated search flow.
   */
  async launch({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { country, sector, sources, city } = request.only(['country', 'sector', 'sources', 'city'])

    if (!country || typeof country !== 'string' || country.length < 2) {
      return response.badRequest({
        error: {
          code: 'COUNTRY_REQUIRED',
          message: 'A valid country is required',
        },
      })
    }

    const result = await this.searchService.launch(user.id, {
      country: country.toUpperCase(),
      sector: sector ?? undefined,
      sourceNames: Array.isArray(sources) ? sources : undefined,
      city: city ?? undefined,
    })

    return response.ok({
      data: result,
      message: `Recherche terminée : ${result.contactsFound} contacts, ${result.contactsRelevant} pertinents, ${result.emailsGenerated} emails générés`,
    })
  }

  /**
   * GET /api/recherche/:id/progress — Get search run progress.
   */
  async progress({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()

    try {
      const searchRun = await this.searchService.getProgress(user.id, params.id)

      return response.ok({
        data: {
          id: searchRun.id,
          status: searchRun.status,
          progressPercent: searchRun.progressPercent,
          currentStep: searchRun.currentStep,
          contactsFound: searchRun.contactsFound,
          contactsRelevant: searchRun.contactsRelevant,
          emailsGenerated: searchRun.emailsGenerated,
          contactsExcludedCooldown: searchRun.contactsExcludedCooldown,
          errorMessage: searchRun.errorMessage,
          startedAt: searchRun.startedAt,
          completedAt: searchRun.completedAt,
        },
      })
    } catch {
      return response.notFound({
        error: { code: 'SEARCH_NOT_FOUND', message: 'Search run not found' },
      })
    }
  }

  /**
   * GET /api/recherche/defaults — Get search defaults from user profile.
   */
  async defaults({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const defaults = await this.searchService.getDefaults(user.id)

    return response.ok({ data: defaults })
  }

  /**
   * GET /api/recherche — List all search runs for the user.
   */
  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const runs = await this.searchService.getRuns(user.id)

    return response.ok({
      data: runs.map((run) => ({
        id: run.id,
        country: run.country,
        sector: run.sector,
        status: run.status,
        progressPercent: run.progressPercent,
        contactsFound: run.contactsFound,
        contactsRelevant: run.contactsRelevant,
        emailsGenerated: run.emailsGenerated,
        contactsExcludedCooldown: run.contactsExcludedCooldown,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        createdAt: run.createdAt,
      })),
    })
  }
}
