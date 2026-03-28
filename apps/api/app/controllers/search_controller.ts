import type { HttpContext } from '@adonisjs/core/http'
import SearchOrchestratorService from '#services/search_orchestrator_service'
import SearchRun from '#models/search_run'
import logger from '@adonisjs/core/services/logger'
// Register scrapers on first import
import '../scrapers/register.js'

export default class SearchController {
  private searchService = new SearchOrchestratorService()

  /**
   * POST /api/recherche — Launch the full automated search flow.
   *
   * Returns immediately with the searchRunId. The pipeline runs in
   * the background. Frontend polls GET /api/recherche/:id/progress.
   */
  async launch({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { country, sector, sources, city, includeHr } = request.only(['country', 'sector', 'sources', 'city', 'includeHr'])

    if (!country || typeof country !== 'string' || country.length < 2) {
      return response.badRequest({
        error: {
          code: 'COUNTRY_REQUIRED',
          message: 'A valid country is required',
        },
      })
    }

    // Create the search run record upfront so we can return its ID immediately
    const searchRun = await SearchRun.create({
      userId: user.id,
      country: country.toUpperCase(),
      sector: sector ?? null,
      status: 'pending',
      contactsFound: 0,
      contactsRelevant: 0,
      emailsGenerated: 0,
      contactsExcludedCooldown: 0,
      progressPercent: 0,
    })

    // Fire-and-forget: run pipeline in background, catch errors to update status
    this.searchService.launchFromRun(searchRun, user.id, {
      country: country.toUpperCase(),
      sector: sector ?? undefined,
      sourceNames: Array.isArray(sources) ? sources : undefined,
      city: city ?? undefined,
      includeHr: includeHr === true,
    }).catch((error) => {
      logger.error('Background search %s failed: %s', searchRun.id, error instanceof Error ? error.message : error)
    })

    // Return immediately — frontend polls progress
    return response.ok({
      data: { searchRunId: searchRun.id },
      message: 'Search launched',
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
