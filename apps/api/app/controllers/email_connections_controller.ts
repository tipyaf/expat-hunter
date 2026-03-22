import type { HttpContext } from '@adonisjs/core/http'
import EmailConnection from '#models/email_connection'
import vine from '@vinejs/vine'

const connectionValidator = vine.compile(
  vine.object({
    imapHost: vine.string().trim(),
    imapPort: vine.number().positive(),
    imapUser: vine.string().trim(),
    imapPassword: vine.string(),
    smtpHost: vine.string().trim(),
    smtpPort: vine.number().positive(),
    smtpUser: vine.string().trim(),
    smtpPassword: vine.string(),
    isActive: vine.boolean().optional(),
  })
)

export default class EmailConnectionsController {
  /**
   * GET /api/email-connections
   * Returns the current user's email connection or null.
   */
  async show({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const connection = await EmailConnection.query()
      .where('userId', user.id)
      .first()

    return response.ok({ data: connection ?? null })
  }

  /**
   * POST /api/email-connections
   * Save or update the user's email connection.
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(connectionValidator)

    const existing = await EmailConnection.query()
      .where('userId', user.id)
      .first()

    let connection: EmailConnection

    if (existing) {
      existing.merge({
        imapHost: payload.imapHost,
        imapPort: payload.imapPort,
        imapUser: payload.imapUser,
        imapPassword: payload.imapPassword,
        smtpHost: payload.smtpHost,
        smtpPort: payload.smtpPort,
        smtpUser: payload.smtpUser,
        smtpPassword: payload.smtpPassword,
        isActive: payload.isActive ?? true,
      })
      await existing.save()
      connection = existing
    } else {
      connection = await EmailConnection.create({
        userId: user.id,
        imapHost: payload.imapHost,
        imapPort: payload.imapPort,
        imapUser: payload.imapUser,
        imapPassword: payload.imapPassword,
        smtpHost: payload.smtpHost,
        smtpPort: payload.smtpPort,
        smtpUser: payload.smtpUser,
        smtpPassword: payload.smtpPassword,
        isActive: payload.isActive ?? true,
      })
    }

    return response.ok({ data: connection })
  }

  /**
   * DELETE /api/email-connections
   * Delete the user's email connection.
   */
  async destroy({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    await EmailConnection.query().where('userId', user.id).delete()
    return response.ok({ data: { success: true } })
  }

  /**
   * POST /api/email-connections/test
   * Test connection (stub - returns success).
   */
  async test({ response }: HttpContext) {
    // Stub: real IMAP/SMTP test TBD
    return response.ok({ data: { success: true, message: 'Connection test successful (stub)' } })
  }
}
