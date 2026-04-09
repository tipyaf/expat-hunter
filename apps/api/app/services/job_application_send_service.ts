import PDFDocument from 'pdfkit'
import OpenRouterClient from '#ai/openrouter_client'
import {
  buildApplicationEmailPrompt,
  parseApplicationEmailResponse,
} from '#ai/prompts/application_email_prompt'
import {
  buildFollowUpEmailPrompt,
  parseFollowUpEmailResponse,
} from '#ai/prompts/follow_up_email_prompt'
import type { FollowUpEmailType } from '#ai/prompts/follow_up_email_prompt'
import CandidateProfile from '#models/candidate_profile'
import JobApplication from '#models/job_application'
import JobOffer from '#models/job_offer'
import RecruitmentContact from '#models/recruitment_contact'
import EmailConnection from '#models/email_connection'
import UsageService from '#services/usage_service'
import logger from '@adonisjs/core/services/logger'
import type { UserPlan } from '@expat-hunter/shared'
import { DateTime } from 'luxon'
import { createTransport } from 'nodemailer'
import mail from '@adonisjs/mail/services/main'
import OAuthTokenService from '#services/oauth_token_service'
import { CONNECTION_TYPE } from '#models/email_connection'

const AI_TEMPERATURE = 0.3
const AI_MAX_TOKENS = 1024
const PDF_FONT_SIZE = 11
const PDF_MARGIN = 50
const PDF_LINE_GAP = 4

const COUNTRY_LANGUAGE_MAP: Record<string, string> = {
  FR: 'fr', CA: 'en', CH: 'fr', BE: 'fr', AU: 'en', NZ: 'en',
  GB: 'en', SG: 'en', AE: 'en', DE: 'en', NL: 'en', JP: 'en',
}
const DEFAULT_LANGUAGE = 'en'

export interface EmailAttachment {
  filename: string
  content: Buffer
  contentType: string
}

export default class JobApplicationSendService {
  private readonly aiClient: OpenRouterClient
  private readonly usageService: UsageService
  private readonly oauthTokenService: OAuthTokenService

  constructor(aiClient?: OpenRouterClient, usageService?: UsageService) {
    this.aiClient = aiClient ?? new OpenRouterClient()
    this.usageService = usageService ?? new UsageService()
    this.oauthTokenService = new OAuthTokenService()
  }

  /**
   * Generate the application email body via AI.
   */
  async generateApplicationEmail(
    offerId: string,
    userId: string,
    plan: UserPlan
  ): Promise<{ application: JobApplication; emailText: string }> {
    const quotaCheck = await this.usageService.checkQuota(userId, plan, 'coverLetterGenerations')
    if (!quotaCheck.allowed) {
      this.throwError('Application email quota exceeded.', 'QUOTA_EXCEEDED', 403)
    }

    const offer = await JobOffer.query()
      .where('id', offerId)
      .preload('companyCache')
      .preload('search')
      .firstOrFail()

    if (offer.search.userId !== userId) {
      this.throwError('Job offer not found', 'E_ROW_NOT_FOUND', 404)
    }

    const application = await JobApplication.query()
      .where('offerId', offerId)
      .where('userId', userId)
      .firstOrFail()

    if (!application.cvText) {
      this.throwError('No CV found. Generate your CV first.', 'NO_CV', 400)
    }

    if (!application.coverLetterText) {
      this.throwError('No cover letter found. Generate your cover letter first.', 'NO_COVER_LETTER', 400)
    }

    const profile = await CandidateProfile.query().where('userId', userId).preload('user').first()
    const country = this.deduceCountry(profile?.targetCountries)

    const cvSummary = application.cvText!.slice(0, 500)
    const coverLetterSummary = application.coverLetterText!.slice(0, 500)

    const { system, user } = buildApplicationEmailPrompt({
      candidateName: profile?.user?.fullName ?? 'Candidate',
      offerTitle: offer.title,
      companyName: offer.companyName ?? offer.companyCache?.name ?? 'the company',
      country,
      cvSummary,
      coverLetterSummary,
    })

    if (!this.aiClient.isConfigured) {
      logger.warn({ offerId }, 'JobApplicationSendService: OpenRouter not configured')
      return { application, emailText: '' }
    }

    try {
      const raw = await this.aiClient.chat({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: AI_TEMPERATURE,
        maxTokens: AI_MAX_TOKENS,
      })

      const emailText = parseApplicationEmailResponse(raw) ?? ''

      application.applicationEmailText = emailText
      await application.save()

      await this.usageService.increment(userId, 'coverLetterGenerations')

      logger.info(
        { offerId, userId, textLength: emailText.length },
        'JobApplicationSendService: Application email generated'
      )

      return { application, emailText }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ offerId, userId, error: message }, 'JobApplicationSendService: AI generation failed')
      this.throwError('Application email generation failed. Please try again later.', 'AI_ERROR', 503)
    }
  }

  /**
   * Send the application email with CV and cover letter as PDF attachments.
   */
  async sendApplication(
    offerId: string,
    userId: string,
    recipientEmail: string
  ): Promise<{ application: JobApplication }> {
    const offer = await JobOffer.query()
      .where('id', offerId)
      .preload('search')
      .firstOrFail()

    if (offer.search.userId !== userId) {
      this.throwError('Job offer not found', 'E_ROW_NOT_FOUND', 404)
    }

    const application = await JobApplication.query()
      .where('offerId', offerId)
      .where('userId', userId)
      .firstOrFail()

    if (!application.cvText) {
      this.throwError('No CV found. Generate your CV first.', 'NO_CV', 400)
    }

    if (!application.coverLetterText) {
      this.throwError('No cover letter found. Generate your cover letter first.', 'NO_COVER_LETTER', 400)
    }

    if (!application.applicationEmailText) {
      this.throwError('No application email found. Generate the email first.', 'NO_APPLICATION_EMAIL', 400)
    }

    const connection = await EmailConnection.findBy('userId', userId)
    if (!connection) {
      this.throwError('No email connection configured. Set up your email first.', 'NO_EMAIL_CONNECTION', 400)
    }

    const cvPdf = await this.textToPdfBuffer(application.cvText!, 'CV — ExpatHunter')
    const coverLetterPdf = await this.textToPdfBuffer(application.coverLetterText!, 'Cover Letter — ExpatHunter')

    const attachments: EmailAttachment[] = [
      { filename: 'cv-expathunter.pdf', content: cvPdf, contentType: 'application/pdf' },
      { filename: 'cover-letter-expathunter.pdf', content: coverLetterPdf, contentType: 'application/pdf' },
    ]

    const subject = `Application: ${offer.title}`

    try {
      await this.sendEmailWithAttachments(
        connection!,
        recipientEmail,
        subject,
        application.applicationEmailText!,
        attachments
      )

      application.status = 'sent'
      application.sentAt = DateTime.now()
      application.sentToEmail = recipientEmail
      await application.save()

      logger.info(
        { offerId, userId, recipientEmail },
        'JobApplicationSendService: Application sent'
      )

      return { application }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ offerId, userId, error: message }, 'JobApplicationSendService: Email send failed')
      this.throwError('Failed to send application email. Please try again later.', 'EMAIL_SEND_FAILED', 503)
    }
  }

  /**
   * Draft a follow-up email for a recruitment contact.
   */
  async draftFollowUpEmail(
    offerId: string,
    contactId: string,
    userId: string,
    type: FollowUpEmailType,
    context: string
  ): Promise<{ emailText: string }> {
    const offer = await JobOffer.query()
      .where('id', offerId)
      .preload('search')
      .preload('companyCache')
      .firstOrFail()

    if (offer.search.userId !== userId) {
      this.throwError('Job offer not found', 'E_ROW_NOT_FOUND', 404)
    }

    const contact = await RecruitmentContact.query()
      .where('id', contactId)
      .where('offerId', offerId)
      .where('userId', userId)
      .firstOrFail()

    if (!contact.email) {
      this.throwError('This contact has no email address.', 'CONTACT_NO_EMAIL', 400)
    }

    if (!this.aiClient.isConfigured) {
      logger.warn({ offerId, contactId }, 'JobApplicationSendService: OpenRouter not configured')
      return { emailText: '' }
    }

    const { system, user } = buildFollowUpEmailPrompt({
      type,
      contactName: contact.name,
      contactRole: contact.role ?? 'Recruitment contact',
      companyName: offer.companyName ?? offer.companyCache?.name ?? 'the company',
      context,
    })

    try {
      const raw = await this.aiClient.chat({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: AI_TEMPERATURE,
        maxTokens: AI_MAX_TOKENS,
      })

      const emailText = parseFollowUpEmailResponse(raw) ?? ''

      logger.info(
        { offerId, contactId, type, textLength: emailText.length },
        'JobApplicationSendService: Follow-up email drafted'
      )

      return { emailText }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ offerId, contactId, error: message }, 'JobApplicationSendService: AI draft failed')
      this.throwError('Follow-up email generation failed. Please try again later.', 'AI_ERROR', 503)
    }
  }

  /**
   * Get the current application email status.
   */
  async getApplicationEmailStatus(
    offerId: string,
    userId: string
  ): Promise<{
    hasEmail: boolean
    emailText: string | null
    status: string
    sentAt: string | null
    sentToEmail: string | null
  }> {
    const offer = await JobOffer.query()
      .where('id', offerId)
      .preload('search')
      .firstOrFail()

    if (offer.search.userId !== userId) {
      this.throwError('Job offer not found', 'E_ROW_NOT_FOUND', 404)
    }

    const application = await JobApplication.query()
      .where('offerId', offerId)
      .where('userId', userId)
      .first()

    if (!application) {
      return { hasEmail: false, emailText: null, status: 'draft', sentAt: null, sentToEmail: null }
    }

    return {
      hasEmail: !!application.applicationEmailText,
      emailText: application.applicationEmailText,
      status: application.status,
      sentAt: application.sentAt?.toISO() ?? null,
      sentToEmail: application.sentToEmail,
    }
  }

  /**
   * Convert text content to a PDF buffer (shared helper).
   */
  async textToPdfBuffer(text: string, title: string): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margin: PDF_MARGIN,
      info: { Title: title, Author: 'ExpatHunter' },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    await new Promise<void>((resolve, reject) => {
      doc.on('end', resolve)
      doc.on('error', reject)

      doc.fontSize(PDF_FONT_SIZE)
      doc.font('Helvetica')

      const lines = text.split('\n')
      for (const line of lines) {
        doc.text(line, { lineGap: PDF_LINE_GAP })
      }

      doc.end()
    })

    return Buffer.concat(chunks)
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private deduceCountry(targetCountries: string[] | null | undefined): string {
    if (!targetCountries || targetCountries.length === 0) return 'US'
    return targetCountries[0]
  }

  private async sendEmailWithAttachments(
    connection: EmailConnection,
    recipientEmail: string,
    subject: string,
    body: string,
    attachments: EmailAttachment[]
  ): Promise<void> {
    if (connection.connectionType === CONNECTION_TYPE.OAUTH) {
      await this.sendViaOAuthWithAttachments(connection, recipientEmail, subject, body, attachments)
    } else {
      await this.sendViaDefaultWithAttachments(recipientEmail, subject, body, attachments)
    }
  }

  private async sendViaOAuthWithAttachments(
    connection: EmailConnection,
    recipientEmail: string,
    subject: string,
    body: string,
    attachments: EmailAttachment[]
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
      subject,
      text: body,
      attachments: attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    })
  }

  private async sendViaDefaultWithAttachments(
    recipientEmail: string,
    subject: string,
    body: string,
    attachments: EmailAttachment[]
  ): Promise<void> {
    await mail.send((message) => {
      message.to(recipientEmail).subject(subject).text(body)
      for (const attachment of attachments) {
        message.attachData(attachment.content, {
          filename: attachment.filename,
          contentType: attachment.contentType,
        })
      }
    })
  }

  private throwError(message: string, code: string, status: number): never {
    const error = new Error(message)
    ;(error as Error & { code: string }).code = code
    ;(error as Error & { status: number }).status = status
    throw error
  }
}
