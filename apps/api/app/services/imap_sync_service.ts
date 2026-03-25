import EmailReply from '#models/email_reply'
import ContactMovementService from '#services/contact_movement_service'
import { DateTime } from 'luxon'

export interface ImapSyncResult {
  synced: number
  errors: number
}

export default class ImapSyncService {
  private movementService = new ContactMovementService()

  /**
   * Sync IMAP replies for a user.
   * In production: connects to IMAP, fetches unread replies, processes them.
   * For now: stub that returns empty result (real IMAP integration TBD).
   */
  async syncForUser(_userId: string): Promise<ImapSyncResult> {
    // Stub implementation - real IMAP polling to be implemented in production
    return { synced: 0, errors: 0 }
  }

  /**
   * Process a raw email reply (for testing or manual import).
   * Called by syncForUser or by tests.
   * Creates EmailReply, detects event, auto-moves kanban.
   */
  async processReply(
    userId: string,
    rawReply: {
      contactId: string
      emailMessageId?: string
      fromEmail: string
      subject: string
      bodyText?: string
      bodyHtml?: string
      receivedAt: Date
    }
  ): Promise<EmailReply> {
    const detectedEvent = this.detectEvent(rawReply.subject, rawReply.bodyText ?? '')

    const reply = await EmailReply.create({
      userId,
      contactId: rawReply.contactId,
      emailMessageId: rawReply.emailMessageId ?? null,
      fromEmail: rawReply.fromEmail,
      subject: rawReply.subject,
      bodyText: rawReply.bodyText ?? null,
      bodyHtml: rawReply.bodyHtml ?? null,
      receivedAt: DateTime.fromJSDate(rawReply.receivedAt),
      isRead: false,
      detectedEvent,
    })

    // Auto-move kanban
    await this.autoMoveContact(rawReply.contactId, detectedEvent)

    return reply
  }

  private detectEvent(
    subject: string,
    bodyText: string
  ): 'interview' | 'rejection' | 'offer' | 'other' {
    const combined = `${subject} ${bodyText}`.toLowerCase()

    if (combined.includes('interview') || combined.includes('entretien')) {
      return 'interview'
    }

    if (
      combined.includes('refus') ||
      combined.includes('désolé') ||
      combined.includes('desole') ||
      combined.includes('unfortunately') ||
      combined.includes('not moving forward') ||
      combined.includes('not selected')
    ) {
      return 'rejection'
    }

    if (
      combined.includes('offre') ||
      combined.includes('offer') ||
      combined.includes('contrat') ||
      combined.includes('contract')
    ) {
      return 'offer'
    }

    return 'other'
  }

  private async autoMoveContact(
    contactId: string,
    detectedEvent: 'interview' | 'rejection' | 'offer' | 'other'
  ): Promise<void> {
    let newStatus: string

    switch (detectedEvent) {
      case 'interview':
        newStatus = 'interview'
        break
      case 'rejection':
        newStatus = 'rejected'
        break
      case 'offer':
        newStatus = 'offer'
        break
      default:
        newStatus = 'replied'
    }

    await this.movementService.moveContact(contactId, newStatus, 'email_replied')
  }
}
