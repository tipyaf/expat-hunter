import type { HttpContext } from '@adonisjs/core/http'
import Contact from '#models/contact'
import ExpatScoringService from '#services/expat_scoring_service'
import type { ExpatScoreResult } from '#services/expat_scoring_service'

const VALID_STATUSES = [
  'identified', 'analyzed', 'to_contact', 'contacted',
  'replied', 'interview', 'offer', 'rejected',
]

export default class ContactsController {
  /**
   * GET /api/contacts — Paginated list with filters.
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const page = Math.max(1, Math.floor(Number(request.input('page', 1)) || 1))
    const limit = Math.min(100, Math.max(1, Math.floor(Number(request.input('limit', 20)) || 20)))
    const status = request.input('status')
    const sourcingRunId = request.input('sourcing_run_id')

    const query = Contact.query()
      .where('userId', user.id)
      .preload('company')
      .orderBy('createdAt', 'desc')

    if (status && VALID_STATUSES.includes(status)) {
      query.where('status', status)
    }
    if (sourcingRunId) {
      query.where('sourcingRunId', sourcingRunId)
    }

    const contacts = await query.paginate(page, limit)
    const scoringService = new ExpatScoringService()
    const scores = await scoringService.calculateBatch(contacts.all())

    return response.ok({
      data: contacts.all().map((c) => this.serialize(c, scores.get(c.id))),
      meta: contacts.getMeta(),
    })
  }

  /**
   * GET /api/contacts/:id — Contact detail.
   */
  async show({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const contact = await Contact.query()
      .where('id', params.id)
      .where('userId', user.id)
      .preload('company')
      .first()

    if (!contact) {
      return response.notFound({
        error: { code: 'CONTACT_NOT_FOUND', message: 'Contact not found' },
      })
    }

    const scoringService = new ExpatScoringService()
    const scoreResult = await scoringService.calculate(contact, contact.company)

    return response.ok({ data: this.serialize(contact, scoreResult) })
  }

  /**
   * PATCH /api/contacts/:id/status — Update pipeline status.
   */
  async updateStatus({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { status } = request.only(['status'])

    if (!status || !VALID_STATUSES.includes(status)) {
      return response.badRequest({
        error: { code: 'INVALID_STATUS', message: `Status must be one of: ${VALID_STATUSES.join(', ')}` },
      })
    }

    const contact = await Contact.query()
      .where('id', params.id)
      .where('userId', user.id)
      .first()

    if (!contact) {
      return response.notFound({
        error: { code: 'CONTACT_NOT_FOUND', message: 'Contact not found' },
      })
    }

    contact.status = status
    await contact.save()

    return response.ok({ data: this.serialize(contact) })
  }

  /**
   * PUT /api/contacts/:id/override — Override AI recommendation.
   */
  async override({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { aiRecommendation } = request.only(['aiRecommendation'])

    const VALID_RECOMMENDATIONS = ['contact', 'skip', 'manual_review']
    if (aiRecommendation && !VALID_RECOMMENDATIONS.includes(aiRecommendation)) {
      return response.badRequest({
        error: { code: 'INVALID_RECOMMENDATION', message: `Recommendation must be one of: ${VALID_RECOMMENDATIONS.join(', ')}` },
      })
    }

    const contact = await Contact.query()
      .where('id', params.id)
      .where('userId', user.id)
      .first()

    if (!contact) {
      return response.notFound({
        error: { code: 'CONTACT_NOT_FOUND', message: 'Contact not found' },
      })
    }

    contact.aiRecommendation = aiRecommendation ?? contact.aiRecommendation
    contact.userOverride = true
    await contact.save()

    return response.ok({ data: this.serialize(contact) })
  }

  /**
   * GET /api/contacts/:id/movements — Status movement history (not yet implemented).
   */
  async movements({ response }: HttpContext) {
    return response.ok({ data: [] })
  }

  private serialize(contact: Contact, score?: ExpatScoreResult) {
    return {
      id: contact.id,
      userId: contact.userId,
      companyId: contact.companyId,
      sourcingRunId: contact.sourcingRunId,
      fullName: contact.fullName,
      role: contact.role,
      email: contact.email,
      linkedinUrl: contact.linkedinUrl,
      source: contact.source,
      sourceDetail: contact.sourceDetail,
      emailSource: contact.emailSource,
      emailConfidence: contact.emailConfidence,
      emailStatus: contact.emailStatus,
      githubUrl: contact.githubUrl,
      status: contact.status,
      relevanceScore: contact.relevanceScore,
      relevanceLabel: contact.relevanceLabel,
      relevanceReason: contact.relevanceReason,
      aiRecommendation: contact.aiRecommendation,
      userOverride: contact.userOverride,
      // Backwards-compatible fields
      confidenceScore: score?.score ?? null,
      confidenceFactors: score?.factors ?? null,
      // New expat scoring
      scoreBreakdown: score?.breakdown ?? null,
      scoreVersion: score?.version ?? null,
      company: contact.company
        ? {
            id: contact.company.id,
            name: contact.company.name,
            sector: contact.company.sector,
            country: contact.company.country,
            city: contact.company.city,
            domain: contact.company.domain,
            visaSponsorStatus: contact.company.visaSponsorStatus,
            visaSponsorCountries: contact.company.visaSponsorCountries,
            hiringIntensity: contact.company.hiringIntensity,
          }
        : null,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    }
  }
}
