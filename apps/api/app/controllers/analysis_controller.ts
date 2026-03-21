import type { HttpContext } from '@adonisjs/core/http'
import AnalysisService from '#services/analysis_service'
import Contact from '#models/contact'

export default class AnalysisController {
  /**
   * POST /api/analysis/run — Launch batch analysis for current user's contacts.
   */
  async run({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { sourcingRunId, batchSize } = request.only(['sourcingRunId', 'batchSize'])

    const service = new AnalysisService()
    const result = await service.analyzeContacts(user.id, {
      sourcingRunId,
      batchSize: batchSize ? Number(batchSize) : undefined,
    })

    return response.ok({ data: result })
  }

  /**
   * POST /api/analysis/contact/:id — Analyze a single contact.
   */
  async analyzeOne({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const service = new AnalysisService()
    const success = await service.analyzeOne(params.id, user.id)

    if (!success) {
      return response.badRequest({
        error: { code: 'ANALYSIS_FAILED', message: 'Could not analyze contact (missing profile or OpenRouter key)' },
      })
    }

    const contact = await Contact.query()
      .where('id', params.id)
      .where('userId', user.id)
      .preload('company')
      .firstOrFail()

    return response.ok({
      data: {
        id: contact.id,
        relevanceScore: contact.relevanceScore,
        relevanceLabel: contact.relevanceLabel,
        relevanceReason: contact.relevanceReason,
        aiRecommendation: contact.aiRecommendation,
        status: contact.status,
      },
    })
  }

  /**
   * GET /api/analysis/stats — Get analysis stats for current user.
   */
  async stats({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const total = await Contact.query().where('userId', user.id).count('* as count')
    const analyzed = await Contact.query().where('userId', user.id).whereNotNull('relevanceScore').count('* as count')
    const byLabel = await Contact.query()
      .where('userId', user.id)
      .whereNotNull('relevanceLabel')
      .select('relevanceLabel')
      .count('* as count')
      .groupBy('relevanceLabel')

    const byRec = await Contact.query()
      .where('userId', user.id)
      .whereNotNull('aiRecommendation')
      .select('aiRecommendation')
      .count('* as count')
      .groupBy('aiRecommendation')

    return response.ok({
      data: {
        total: Number(total[0].$extras.count),
        analyzed: Number(analyzed[0].$extras.count),
        pending: Number(total[0].$extras.count) - Number(analyzed[0].$extras.count),
        byLabel: Object.fromEntries(
          byLabel.map((r) => [r.relevanceLabel, Number(r.$extras.count)])
        ),
        byRecommendation: Object.fromEntries(
          byRec.map((r) => [r.aiRecommendation, Number(r.$extras.count)])
        ),
      },
    })
  }
}
