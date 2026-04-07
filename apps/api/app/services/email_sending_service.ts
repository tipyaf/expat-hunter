import { createTransport } from 'nodemailer'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import EmailMessage from '#models/email_message'
import Contact from '#models/contact'
import EmailConnection, { CONNECTION_TYPE } from '#models/email_connection'
import OAuthTokenService from '#services/oauth_token_service'
import ContactMovementService from '#services/contact_movement_service'
import logger from '@adonisjs/core/services/logger'

export interface SendBatchResult {
  batchId: string
  total: number
  sent: number
  failed: number
  errors: Array<{ emailId: string; reason: string }>
}

export interface BatchProgress {
  batchId: string
  status: 'running' | 'completed' | 'failed'
  total: number
  sent: number
  failed: number
  completedAt: string | null
}

// In-memory progress store (sufficient for single-instance deployments)
const batchProgressStore = new Map<string, BatchProgress>()

export default class EmailSendingService {
  private readonly movementService = new ContactMovementService()
  private readonly oauthTokenService = new OAuthTokenService()

  /**
   * Send all approved emails for a user in batch.
   * Returns a batchId for progress tracking.
   */
  async sendBatch(
    userId: string,
    emailIds?: string[]
  ): Promise<{ batchId: string; total: number }> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const query = EmailMessage.query()
      .where('status', 'approved')
      .whereHas('contact', (q) => q.where('userId', userId))
      .preload('contact', (q) => q.preload('company'))

    if (emailIds && emailIds.length > 0) {
      query.whereIn('id', emailIds)
    }

    const emails = await query

    const progress: BatchProgress = {
      batchId,
      status: 'running',
      total: emails.length,
      sent: 0,
      failed: 0,
      completedAt: null,
    }
    batchProgressStore.set(batchId, progress)

    // Send asynchronously — don't await here so the endpoint returns immediately
    void this.processBatch(batchId, userId, emails)

    return { batchId, total: emails.length }
  }

  /**
   * Get current progress for a batch.
   */
  getProgress(batchId: string): BatchProgress | null {
    return batchProgressStore.get(batchId) ?? null
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private async processBatch(batchId: string, userId: string, emails: EmailMessage[]): Promise<void> {
    const progress = batchProgressStore.get(batchId)!

    // Load user's email connection to determine auth method
    const connection = await EmailConnection.findBy('userId', userId)

    for (const email of emails) {
      const contact = email.contact as Contact & { company?: { name: string } | null }
      const recipientEmail = contact?.email

      if (!recipientEmail) {
        progress.failed++
        continue
      }

      try {
        await this.sendSingleEmail(email, recipientEmail, connection)

        email.status = 'sent'
        email.sentAt = DateTime.now()
        await email.save()

        // Update contact status to contacted and record movement
        if (contact && contact.status === 'to_contact') {
          contact.status = 'contacted'
          contact.lastContactedAt = DateTime.now()
          await contact.save()
          await this.movementService.recordMovement(contact.id, 'to_contact', 'contacted', 'email_sent')
        }

        progress.sent++
      } catch (err) {
        progress.failed++
        const reason = err instanceof Error ? err.message : 'Unknown error'
        logger.error({ emailId: email.id, reason }, 'Failed to send email')
      }
    }

    progress.status = 'completed'
    progress.completedAt = DateTime.now().toISO()
  }

  private async sendSingleEmail(
    email: EmailMessage,
    recipientEmail: string,
    connection: EmailConnection | null
  ): Promise<void> {
    if (connection?.connectionType === CONNECTION_TYPE.OAUTH) {
      await this.sendViaOAuth(email, recipientEmail, connection)
    } else {
      await this.sendViaDefault(email, recipientEmail)
    }
  }

  /**
   * Send email using XOAUTH2 authentication (Google OAuth).
   */
  private async sendViaOAuth(
    email: EmailMessage,
    recipientEmail: string,
    connection: EmailConnection
  ): Promise<void> {
    const accessToken = await this.oauthTokenService.ensureFreshToken(connection)

    const transport = createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: connection.oauthEmail ?? connection.smtpUser,
        accessToken,
      },
    })

    await transport.sendMail({
      from: connection.oauthEmail ?? connection.smtpUser,
      to: recipientEmail,
      subject: email.subject,
      text: email.body,
    })
  }

  /**
   * Send email using default AdonisJS mailer (SMTP with password).
   */
  private async sendViaDefault(
    email: EmailMessage,
    recipientEmail: string
  ): Promise<void> {
    await mail.send((message) => {
      message
        .to(recipientEmail)
        .subject(email.subject)
        .text(email.body)
    })
  }
}
