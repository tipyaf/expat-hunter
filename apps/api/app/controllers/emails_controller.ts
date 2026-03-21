import type { HttpContext } from '@adonisjs/core/http'
import EmailMessage from '#models/email_message'
import Contact from '#models/contact'
import EmailGenerationService from '#services/email_generation_service'

const VALID_STATUSES = ['draft', 'approved', 'sent', 'opened', 'replied', 'bounced']

export default class EmailsController {
  /**
   * GET /api/emails — List emails for current user (paginated).
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const status = request.input('status')
    const contactId = request.input('contact_id')

    const query = EmailMessage.query()
      .whereHas('contact', (q) => q.where('userId', user.id))
      .preload('contact', (q) => q.preload('company'))
      .orderBy('createdAt', 'desc')

    if (status && VALID_STATUSES.includes(status)) {
      query.where('status', status)
    }
    if (contactId) {
      query.where('contactId', contactId)
    }

    const emails = await query.paginate(page, limit)

    return response.ok({
      data: emails.all().map((e) => this.serialize(e)),
      meta: emails.getMeta(),
    })
  }

  /**
   * GET /api/emails/:id — Single email detail.
   */
  async show({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const email = await EmailMessage.query()
      .where('id', params.id)
      .whereHas('contact', (q) => q.where('userId', user.id))
      .preload('contact', (q) => q.preload('company'))
      .first()

    if (!email) {
      return response.notFound({ error: { code: 'EMAIL_NOT_FOUND', message: 'Email not found' } })
    }

    return response.ok({ data: this.serialize(email) })
  }

  /**
   * PUT /api/emails/:id — Edit draft email (subject/body).
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { subject, body } = request.only(['subject', 'body'])

    const email = await EmailMessage.query()
      .where('id', params.id)
      .whereHas('contact', (q) => q.where('userId', user.id))
      .first()

    if (!email) {
      return response.notFound({ error: { code: 'EMAIL_NOT_FOUND', message: 'Email not found' } })
    }

    if (email.status !== 'draft') {
      return response.badRequest({ error: { code: 'NOT_DRAFT', message: 'Only draft emails can be edited' } })
    }

    if (subject) email.subject = subject
    if (body) email.body = body
    await email.save()

    return response.ok({ data: this.serialize(email) })
  }

  /**
   * POST /api/emails/:id/approve — Approve a draft email.
   */
  async approve({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const email = await EmailMessage.query()
      .where('id', params.id)
      .whereHas('contact', (q) => q.where('userId', user.id))
      .first()

    if (!email) {
      return response.notFound({ error: { code: 'EMAIL_NOT_FOUND', message: 'Email not found' } })
    }

    if (email.status !== 'draft') {
      return response.badRequest({ error: { code: 'NOT_DRAFT', message: 'Only draft emails can be approved' } })
    }

    email.status = 'approved'
    await email.save()

    return response.ok({ data: this.serialize(email) })
  }

  /**
   * POST /api/emails/:id/reject — Reject (delete) a draft email.
   */
  async reject({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const email = await EmailMessage.query()
      .where('id', params.id)
      .whereHas('contact', (q) => q.where('userId', user.id))
      .first()

    if (!email) {
      return response.notFound({ error: { code: 'EMAIL_NOT_FOUND', message: 'Email not found' } })
    }

    if (email.status !== 'draft') {
      return response.badRequest({ error: { code: 'NOT_DRAFT', message: 'Only draft emails can be rejected' } })
    }

    await email.delete()

    return response.ok({ data: { deleted: true } })
  }

  /**
   * POST /api/emails/generate — Generate emails for recommended contacts.
   */
  async generate({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { contactIds, batchSize } = request.only(['contactIds', 'batchSize'])

    const service = new EmailGenerationService()
    const result = await service.generateForContacts(user.id, {
      contactIds: contactIds ?? undefined,
      batchSize: batchSize ? Number(batchSize) : undefined,
    })

    return response.ok({ data: result })
  }

  /**
   * POST /api/emails/:id/regenerate — Regenerate a draft email with AI.
   */
  async regenerate({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const service = new EmailGenerationService()
    const email = await service.regenerate(params.id, user.id)

    if (!email) {
      return response.badRequest({
        error: { code: 'REGENERATE_FAILED', message: 'Could not regenerate email' },
      })
    }

    await email.load('contact', (q) => q.preload('company'))

    return response.ok({ data: this.serialize(email) })
  }

  /**
   * POST /api/emails/approve-batch — Approve multiple draft emails.
   */
  async approveBatch({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { emailIds } = request.only(['emailIds'])

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return response.badRequest({ error: { code: 'INVALID_IDS', message: 'emailIds must be a non-empty array' } })
    }

    const emails = await EmailMessage.query()
      .whereIn('id', emailIds)
      .where('status', 'draft')
      .whereHas('contact', (q) => q.where('userId', user.id))

    let approved = 0
    for (const email of emails) {
      email.status = 'approved'
      await email.save()
      approved++
    }

    return response.ok({ data: { approved } })
  }

  private serialize(email: EmailMessage) {
    return {
      id: email.id,
      contactId: email.contactId,
      subject: email.subject,
      body: email.body,
      type: email.type,
      status: email.status,
      sentAt: email.sentAt,
      scheduledAt: email.scheduledAt,
      openedAt: email.openedAt,
      repliedAt: email.repliedAt,
      contact: email.contact
        ? {
            id: email.contact.id,
            fullName: email.contact.fullName,
            role: email.contact.role,
            email: email.contact.email,
            company: email.contact.company
              ? { id: email.contact.company.id, name: email.contact.company.name }
              : null,
          }
        : null,
      createdAt: email.createdAt,
      updatedAt: email.updatedAt,
    }
  }
}
