import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import EmailMessage from '#models/email_message'
import Contact from '#models/contact'

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
    void this.processBatch(batchId, emails)

    return { batchId, total: emails.length }
  }

  /**
   * Get current progress for a batch.
   */
  getProgress(batchId: string): BatchProgress | null {
    return batchProgressStore.get(batchId) ?? null
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private async processBatch(batchId: string, emails: EmailMessage[]): Promise<void> {
    const progress = batchProgressStore.get(batchId)!
    const errors: Array<{ emailId: string; reason: string }> = []

    for (const email of emails) {
      const contact = email.contact as Contact & { company?: { name: string } | null }
      const recipientEmail = contact?.email

      if (!recipientEmail) {
        progress.failed++
        errors.push({ emailId: email.id, reason: 'No email address on contact' })
        continue
      }

      try {
        await mail.send((message) => {
          message
            .to(recipientEmail)
            .subject(email.subject)
            .text(email.body)
        })

        email.status = 'sent'
        email.sentAt = DateTime.now()
        await email.save()

        // Update contact status to contacted
        if (contact && contact.status === 'to_contact') {
          contact.status = 'contacted'
          contact.lastContactedAt = DateTime.now()
          await contact.save()
        }

        progress.sent++
      } catch (err) {
        progress.failed++
        const reason = err instanceof Error ? err.message : 'Unknown error'
        errors.push({ emailId: email.id, reason })
      }
    }

    progress.status = 'completed'
    progress.completedAt = DateTime.now().toISO()
  }
}
