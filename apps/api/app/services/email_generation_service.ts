import { EmailComposer } from '#ai/email_composer'
import type { CandidateForEmail, ContactForEmail } from '#ai/prompts/email_prompt'
import Contact from '#models/contact'
import CandidateProfile from '#models/candidate_profile'
import EmailMessage from '#models/email_message'
import type { EmailType } from '#models/email_message'
import User from '#models/user'
import logger from '@adonisjs/core/services/logger'

interface GenerationResult {
  generated: number
  errors: number
  skipped: number
  emailIds: string[]
}

export default class EmailGenerationService {
  private composer: EmailComposer

  constructor(composer?: EmailComposer) {
    this.composer = composer ?? new EmailComposer()
  }

  async generateForContacts(
    userId: string,
    options?: { contactIds?: string[]; batchSize?: number }
  ): Promise<GenerationResult> {
    if (!this.composer.isConfigured) {
      logger.warn('EmailGenerationService: OpenRouter not configured, skipping')
      return { generated: 0, errors: 0, skipped: 0, emailIds: [] }
    }

    const user = await User.find(userId)
    const profile = await CandidateProfile.query().where('userId', userId).first()

    if (!user || !profile) {
      logger.warn('EmailGenerationService: No user or profile found for %s', userId)
      return { generated: 0, errors: 0, skipped: 0, emailIds: [] }
    }

    const candidate = this.buildCandidateData(user, profile)
    const batchSize = options?.batchSize ?? 10

    const query = Contact.query()
      .where('userId', userId)
      .where('aiRecommendation', 'contact')
      .whereDoesntHave('emails', (q) => {
        q.where('type', 'initial')
      })
      .preload('company')
      .limit(batchSize)

    if (options?.contactIds?.length) {
      query.whereIn('id', options.contactIds)
    }

    const contacts = await query

    if (contacts.length === 0) {
      return { generated: 0, errors: 0, skipped: 0, emailIds: [] }
    }

    const result: GenerationResult = { generated: 0, errors: 0, skipped: 0, emailIds: [] }

    for (const contact of contacts) {
      if (!contact.company || !contact.email) {
        result.skipped++
        continue
      }

      try {
        const contactData = this.buildContactData(contact)
        const email = await this.composer.compose(contactData, candidate)

        const message = await EmailMessage.create({
          contactId: contact.id,
          subject: email.subject,
          body: email.body,
          type: 'initial' as EmailType,
          status: 'draft',
        })

        if (contact.status === 'analyzed') {
          contact.status = 'to_contact'
          await contact.save()
        }

        result.generated++
        result.emailIds.push(message.id)

        logger.info('Generated email for contact %s: "%s"', contact.fullName, email.subject)
      } catch (err) {
        result.errors++
        logger.error('Failed to generate email for contact %s: %s', contact.id, (err as Error).message)
      }
    }

    return result
  }

  async generateOne(contactId: string, userId: string): Promise<EmailMessage | null> {
    if (!this.composer.isConfigured) return null

    const user = await User.find(userId)
    const profile = await CandidateProfile.query().where('userId', userId).first()
    if (!user || !profile) return null

    const contact = await Contact.query()
      .where('id', contactId)
      .where('userId', userId)
      .preload('company')
      .first()

    if (!contact || !contact.company || !contact.email) return null

    const candidate = this.buildCandidateData(user, profile)
    const contactData = this.buildContactData(contact)
    const email = await this.composer.compose(contactData, candidate)

    return EmailMessage.create({
      contactId: contact.id,
      subject: email.subject,
      body: email.body,
      type: 'initial' as EmailType,
      status: 'draft',
    })
  }

  async regenerate(
    emailId: string,
    userId: string,
    options?: { instructions?: string }
  ): Promise<EmailMessage | null> {
    if (!this.composer.isConfigured) return null

    const email = await EmailMessage.query()
      .where('id', emailId)
      .preload('contact', (q) => q.where('userId', userId).preload('company'))
      .first()

    if (!email || !email.contact || email.status !== 'draft') return null

    const user = await User.find(userId)
    const profile = await CandidateProfile.query().where('userId', userId).first()
    if (!user || !profile) return null

    const candidate = this.buildCandidateData(user, profile)
    const contactData = this.buildContactData(email.contact)
    const result = await this.composer.compose(contactData, candidate, {
      instructions: options?.instructions,
    })

    email.subject = result.subject
    email.body = result.body
    await email.save()

    return email
  }

  private buildCandidateData(user: User, profile: CandidateProfile): CandidateForEmail {
    return {
      fullName: user.fullName,
      skills: profile.skills ?? [],
      experienceYears: profile.experienceYears ?? 0,
      targetRoles: profile.targetRoles ?? [],
      cvSummary: null,
    }
  }

  private buildContactData(contact: Contact): ContactForEmail {
    return {
      fullName: contact.fullName,
      role: contact.role,
      companyName: contact.company.name,
      companySector: contact.company.sector,
      companyCountry: contact.company.country,
      companyCity: contact.company.city,
    }
  }
}
