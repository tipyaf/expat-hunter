import type { HttpContext } from '@adonisjs/core/http'
import EmailMessage from '#models/email_message'
import EmailGenerationService from '#services/email_generation_service'
import EmailSendingService from '#services/email_sending_service'
import UsageService from '#services/usage_service'

const VALID_STATUSES = ['draft', 'approved', 'sent', 'opened', 'replied', 'bounced']
const MAX_INSTRUCTIONS_LENGTH = 500

export default class EmailsController {
  private readonly usageService = new UsageService()
  /**
   * GET /api/emails — List emails for current user (paginated).
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const page = Math.max(1, Math.floor(Number(request.input('page', 1)) || 1))
    const limit = Math.min(100, Math.max(1, Math.floor(Number(request.input('limit', 20)) || 20)))
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
    const { contactIds, batchSize, presetId } = request.only(['contactIds', 'batchSize', 'presetId'])

    // Quota check: emails
    const emailCheck = await this.usageService.checkQuota(user.id, user.plan, 'emails')
    if (!emailCheck.allowed) {
      return response.forbidden({
        error: { code: 'QUOTA_EXCEEDED', message: 'Email generation quota exceeded. Upgrade to Premium for unlimited emails.' },
        quota: emailCheck.quota,
      })
    }

    const MAX_BATCH = 50
    const safeBatch = batchSize ? Math.min(Math.max(1, Math.floor(Number(batchSize) || 10)), MAX_BATCH) : undefined
    const safePresetId = typeof presetId === 'string' && presetId.trim() ? presetId.trim() : undefined

    const service = new EmailGenerationService()
    const result = await service.generateForContacts(user.id, {
      contactIds: contactIds ?? undefined,
      batchSize: safeBatch,
      presetId: safePresetId,
    })

    // Increment email counter by number generated
    const generated = result?.generated ?? 0
    if (generated > 0) {
      await this.usageService.increment(user.id, 'emails', generated)
    }
    const emailQuota = await this.usageService.getRemainingQuota(user.id, user.plan, 'emails')

    return response.ok({ data: result, quota: emailQuota })
  }

  /**
   * POST /api/emails/:id/regenerate — Regenerate a draft email with AI.
   */
  async regenerate({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const rawInstructions = request.input('instructions')
    const instructions = typeof rawInstructions === 'string'
      ? rawInstructions.trim().slice(0, MAX_INSTRUCTIONS_LENGTH) || undefined
      : undefined

    const rawTemplateId = request.input('templateId')
    const templateId = typeof rawTemplateId === 'string' && rawTemplateId.trim()
      ? rawTemplateId.trim()
      : undefined

    const rawPresetId = request.input('presetId')
    const presetId = typeof rawPresetId === 'string' && rawPresetId.trim()
      ? rawPresetId.trim()
      : undefined

    const service = new EmailGenerationService()
    const email = await service.regenerate(params.id, user.id, { instructions, templateId, presetId })

    if (!email) {
      return response.badRequest({
        error: { code: 'REGENERATE_FAILED', message: 'Could not regenerate email' },
      })
    }

    await email.load('contact', (q) => q.preload('company'))

    return response.ok({ data: this.serialize(email) })
  }

  /**
   * POST /api/emails/send-batch — Send all approved emails in background.
   */
  async sendBatch({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { emailIds } = request.only(['emailIds'])

    const service = new EmailSendingService()
    const result = await service.sendBatch(
      user.id,
      Array.isArray(emailIds) && emailIds.length > 0 ? emailIds : undefined
    )

    return response.ok({ data: result })
  }

  /**
   * GET /api/emails/send-batch/:batchId/progress — Get send batch progress.
   */
  async sendBatchProgress({ params, response }: HttpContext) {
    const service = new EmailSendingService()
    const progress = service.getProgress(params.batchId)

    if (!progress) {
      return response.notFound({ error: { code: 'BATCH_NOT_FOUND', message: 'Batch not found' } })
    }

    return response.ok({ data: progress })
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

    const service = new EmailGenerationService()
    const approved = await service.approveBatchDrafts(emailIds, user.id)

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
