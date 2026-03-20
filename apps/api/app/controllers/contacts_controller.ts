import type { HttpContext } from '@adonisjs/core/http'
import Contact from '#models/contact'

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
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
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

    return response.ok({
      data: contacts.all().map((c) => this.serialize(c)),
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

    return response.ok({ data: this.serialize(contact) })
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

  private serialize(contact: Contact) {
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
      status: contact.status,
      relevanceScore: contact.relevanceScore,
      relevanceLabel: contact.relevanceLabel,
      relevanceReason: contact.relevanceReason,
      aiRecommendation: contact.aiRecommendation,
      userOverride: contact.userOverride,
      company: contact.company
        ? {
            id: contact.company.id,
            name: contact.company.name,
            sector: contact.company.sector,
            country: contact.company.country,
            city: contact.company.city,
          }
        : null,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    }
  }
}
