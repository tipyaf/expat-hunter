import type { HttpContext } from '@adonisjs/core/http'
import EmailReply from '#models/email_reply'
import EmailMessage from '#models/email_message'
import ImapSyncService from '#services/imap_sync_service'
import ReplyGenerationService from '#services/reply_generation_service'
import vine from '@vinejs/vine'

const generateReplyValidator = vine.compile(
  vine.object({
    replyId: vine.string().trim(),
  })
)

export default class ThreadController {
  private readonly imapSyncService = new ImapSyncService()
  private readonly replyGenerationService = new ReplyGenerationService()

  /**
   * GET /api/contacts/:id/thread
   * Returns replies and emails for a contact.
   */
  async thread({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const contactId = params.id as string

    const replies = await EmailReply.query()
      .where('contactId', contactId)
      .where('userId', user.id)
      .orderBy('receivedAt', 'desc')

    const emails = await EmailMessage.query()
      .where('contactId', contactId)
      .orderBy('createdAt', 'desc')

    const latestReply = replies[0] ?? null

    return response.ok({
      data: {
        replies,
        emails,
        summary: latestReply?.aiSummary ?? null,
      },
    })
  }

  /**
   * GET /api/contacts/:id/summary
   * Returns or generates AI summary for a contact thread.
   */
  async summary({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const contactId = params.id as string

    const replies = await EmailReply.query()
      .where('contactId', contactId)
      .where('userId', user.id)
      .orderBy('receivedAt', 'asc')

    const originalEmail = await EmailMessage.query()
      .where('contactId', contactId)
      .orderBy('createdAt', 'asc')
      .first()

    const summaryText = await this.replyGenerationService.summarizeThread(
      replies,
      originalEmail ?? undefined
    )

    return response.ok({ data: { summary: summaryText } })
  }

  /**
   * POST /api/contacts/:id/reply
   * Stub: marks as sent in email_messages.
   */
  async reply({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const contactId = params.id as string
    const { subject, body } = request.only(['subject', 'body']) as {
      subject: string
      body: string
    }

    // Stub: create an email_messages record to track sent reply
    await EmailMessage.create({
      contactId,
      subject,
      body,
      type: 'follow_up_1',
      status: 'sent',
      sentAt: new Date() as unknown as import('luxon').DateTime,
    })

    return response.ok({ data: { success: true } })
  }

  /**
   * POST /api/contacts/:id/reply/generate
   * Generates an AI reply suggestion.
   */
  async generateReply({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const contactId = params.id as string

    const payload = await request.validateUsing(generateReplyValidator)
    const { replyId } = payload

    const replyRecord = await EmailReply.query()
      .where('id', replyId)
      .where('contactId', contactId)
      .where('userId', user.id)
      .firstOrFail()

    const originalEmail = await EmailMessage.query()
      .where('contactId', contactId)
      .orderBy('createdAt', 'asc')
      .first()

    const suggestedReply = await this.replyGenerationService.generateReply({
      contactFullName: replyRecord.fromEmail,
      companyName: '',
      originalEmailBody: originalEmail?.body ?? '',
      replyBody: replyRecord.bodyText ?? replyRecord.subject,
    })

    return response.ok({ data: { suggestedReply } })
  }

  /**
   * POST /api/contacts/:id/sync
   * Triggers IMAP sync for the user.
   */
  async sync({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const result = await this.imapSyncService.syncForUser(user.id)
    return response.ok({ data: result })
  }

  /**
   * GET /api/replies/unread-count
   * Returns unread reply count for the authenticated user.
   */
  async unreadCount({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const countResult = await EmailReply.query()
      .where('userId', user.id)
      .where('isRead', false)
      .count('* as total')

    const total = Number(
      (countResult[0] as unknown as { $extras: { total: string | number } }).$extras?.total ?? 0
    )

    return response.ok({ data: { count: total } })
  }
}
