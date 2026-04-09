import RecruitmentContact from '#models/recruitment_contact'
import Contact from '#models/contact'
import JobOffer from '#models/job_offer'
import logger from '@adonisjs/core/services/logger'

const RECRUITMENT_STATUS_IN_PROCESS = 'in_recruitment_process'

export interface CreateContactData {
  name: string
  role?: string
  email?: string
  linkedinUrl?: string
  notes?: string
}

export interface UpdateContactData {
  name?: string
  role?: string | null
  email?: string | null
  linkedinUrl?: string | null
  notes?: string | null
}

export default class RecruitmentContactService {
  /**
   * Verify that the offer belongs to the user. Throws E_ROW_NOT_FOUND if not.
   */
  async verifyOfferOwnership(offerId: string, userId: string): Promise<JobOffer> {
    const offer = await JobOffer.query()
      .where('id', offerId)
      .preload('search')
      .firstOrFail()

    if (offer.search.userId !== userId) {
      const error = new Error('Job offer not found')
      ;(error as Error & { code: string }).code = 'E_ROW_NOT_FOUND'
      throw error
    }

    return offer
  }

  /**
   * Create a recruitment contact linked to an offer.
   * Runs cross-pipeline detection after creation.
   */
  async createContact(
    offerId: string,
    userId: string,
    data: CreateContactData
  ): Promise<RecruitmentContact> {
    const offer = await this.verifyOfferOwnership(offerId, userId)

    if (data.email) {
      const existing = await RecruitmentContact.query()
        .where('offerId', offerId)
        .where('email', data.email)
        .first()

      if (existing) {
        const error = new Error('A contact with this email already exists for this offer')
        ;(error as Error & { code: string }).code = 'DUPLICATE_CONTACT'
        throw error
      }
    }

    const contact = await RecruitmentContact.create({
      offerId,
      userId,
      name: data.name,
      role: data.role ?? null,
      email: data.email ?? null,
      linkedinUrl: data.linkedinUrl ?? null,
      notes: data.notes ?? null,
    })

    if (data.email && offer.companyCacheId) {
      await this.detectCrossPipeline(contact, userId, offer.companyCacheId)
    }

    return contact
  }

  /**
   * List all recruitment contacts for an offer.
   */
  async listContacts(offerId: string, userId: string): Promise<RecruitmentContact[]> {
    await this.verifyOfferOwnership(offerId, userId)

    return RecruitmentContact.query()
      .where('offerId', offerId)
      .where('userId', userId)
      .orderBy('createdAt', 'asc')
  }

  /**
   * Update a recruitment contact.
   */
  async updateContact(
    offerId: string,
    contactId: string,
    userId: string,
    data: UpdateContactData
  ): Promise<RecruitmentContact> {
    await this.verifyOfferOwnership(offerId, userId)

    const contact = await RecruitmentContact.query()
      .where('id', contactId)
      .where('offerId', offerId)
      .where('userId', userId)
      .firstOrFail()

    if (data.name !== undefined) contact.name = data.name
    if (data.role !== undefined) contact.role = data.role
    if (data.email !== undefined) contact.email = data.email
    if (data.linkedinUrl !== undefined) contact.linkedinUrl = data.linkedinUrl
    if (data.notes !== undefined) contact.notes = data.notes

    await contact.save()
    return contact
  }

  /**
   * Remove a recruitment contact.
   * If the contact was cross-pipeline linked, clears the lead's recruitment status.
   */
  async removeContact(
    offerId: string,
    contactId: string,
    userId: string
  ): Promise<void> {
    await this.verifyOfferOwnership(offerId, userId)

    const contact = await RecruitmentContact.query()
      .where('id', contactId)
      .where('offerId', offerId)
      .where('userId', userId)
      .firstOrFail()

    if (contact.leadId) {
      await this.clearRecruitmentStatus(contact.leadId)
    }

    await contact.delete()
  }

  /**
   * Detect if a recruitment contact's email matches a lead in the same company.
   * If so, flag the lead as in_recruitment_process and link the recruitment contact.
   */
  async detectCrossPipeline(
    recruitmentContact: RecruitmentContact,
    userId: string,
    companyCacheId: string
  ): Promise<void> {
    if (!recruitmentContact.email) return

    const lead = await Contact.query()
      .where('userId', userId)
      .where('email', recruitmentContact.email)
      .whereHas('company', (query) => {
        query.where('companyCacheId', companyCacheId)
      })
      .first()

    if (!lead) return

    lead.recruitmentStatus = RECRUITMENT_STATUS_IN_PROCESS
    await lead.save()

    recruitmentContact.leadId = lead.id
    await recruitmentContact.save()

    logger.info(
      { leadId: lead.id, recruitmentContactId: recruitmentContact.id },
      'Cross-pipeline detected: lead flagged as in_recruitment_process'
    )
  }

  /**
   * Re-prospect: clear the lead's recruitment status, returning them to the pipeline.
   */
  async reProspect(
    offerId: string,
    contactId: string,
    userId: string
  ): Promise<void> {
    await this.verifyOfferOwnership(offerId, userId)

    const contact = await RecruitmentContact.query()
      .where('id', contactId)
      .where('offerId', offerId)
      .where('userId', userId)
      .firstOrFail()

    if (!contact.leadId) {
      const error = new Error('This recruitment contact has no linked lead')
      ;(error as Error & { code: string }).code = 'NO_LINKED_LEAD'
      throw error
    }

    await this.clearRecruitmentStatus(contact.leadId)

    contact.leadId = null
    await contact.save()
  }

  /**
   * Clear recruitment status on a lead (only if it's still in_recruitment_process).
   */
  private async clearRecruitmentStatus(leadId: string): Promise<void> {
    const lead = await Contact.find(leadId)
    if (!lead) return

    if (lead.recruitmentStatus === RECRUITMENT_STATUS_IN_PROCESS) {
      lead.recruitmentStatus = null
      await lead.save()
    }
  }
}
