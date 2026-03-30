/**
 * EmailEnrichmentOrchestrator — Enriches contacts without emails
 * using Hunter.io, Apollo, and pattern inference (via EmailEnricher),
 * then verifies discovered emails via SMTP handshake (via EmailVerifier).
 */
import Contact from '#models/contact'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import EmailEnricher from './email_enricher.js'
import EmailVerifier from './email_verifier.js'

const ENRICHMENT_BATCH_SIZE = 50
const ENRICHMENT_CONCURRENCY = 3
const VERIFICATION_BATCH_SIZE = 30

export default class EmailEnrichmentOrchestrator {
  /**
   * Enrich emails for contacts from a sourcing run that have no email.
   * Uses Hunter.io -> Apollo -> pattern inference (always available as fallback).
   * Max 50 contacts per run to respect API rate limits.
   */
  async enrichContactEmails(userId: string, sourcingRunId: string): Promise<void> {
    const contactsWithoutEmail = await Contact.query()
      .where('userId', userId)
      .where('sourcingRunId', sourcingRunId)
      .whereNull('email')
      .preload('company')
      .limit(ENRICHMENT_BATCH_SIZE)

    if (contactsWithoutEmail.length === 0) {
      logger.info('Email enrichment: no contacts without email, skipping')
      return
    }

    logger.info(
      'Email enrichment: enriching %d contacts without email',
      contactsWithoutEmail.length
    )

    const enricher = new EmailEnricher()
    let enrichedCount = 0

    const chunks = this.chunk(contactsWithoutEmail, ENRICHMENT_CONCURRENCY)
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (contact) => {
          const domain =
            contact.company?.domain ?? this.extractDomain(contact.company?.website ?? '')

          if (!domain) return

          try {
            const result = await enricher.enrich(contact.fullName, domain)
            if (result.email) {
              contact.email = result.email
              contact.emailSource = result.source
              contact.emailConfidence = result.confidence
              contact.emailStatus = result.status
              contact.emailAlternatives =
                result.alternatives.length > 0 ? result.alternatives : null
              await contact.save()
              enrichedCount++
            }
          } catch (error) {
            logger.warn(
              'Email enrichment failed for contact %s: %s',
              contact.id,
              error instanceof Error ? error.message : 'Unknown error'
            )
          }
        })
      )
    }

    logger.info(
      'Email enrichment: enriched %d/%d contacts',
      enrichedCount,
      contactsWithoutEmail.length
    )
  }

  /**
   * Verify emails using SMTP handshake for contacts that have emails.
   */
  async verifyContactEmails(userId: string, sourcingRunId: string): Promise<void> {
    const verifier = new EmailVerifier()

    const contactsWithEmail = await Contact.query()
      .where('userId', userId)
      .where('sourcingRunId', sourcingRunId)
      .whereNotNull('email')
      .where((q) => {
        q.whereNull('emailVerifyMethod').orWhere('emailStatus', 'probable')
      })
      .limit(VERIFICATION_BATCH_SIZE)

    let verified = 0
    for (const contact of contactsWithEmail) {
      try {
        const result = await verifier.verify(contact.email!)
        contact.emailStatus = result.status === 'verified' ? 'verified'
          : result.status === 'invalid' ? 'bounced'
          : 'probable'
        contact.emailConfidence = result.confidence
        contact.emailVerifiedAt = DateTime.now()
        contact.emailVerifyMethod = result.method
        await contact.save()
        if (result.status === 'verified') verified++
      } catch {
        // Skip failed verifications
      }
    }

    logger.info('Email verification: %d/%d verified', verified, contactsWithEmail.length)
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
    return chunks
  }

  private extractDomain(website: string): string {
    if (!website) return ''
    try {
      const url = new URL(website.startsWith('http') ? website : `https://${website}`)
      return url.hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  }
}
