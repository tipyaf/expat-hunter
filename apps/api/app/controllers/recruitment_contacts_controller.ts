import type { HttpContext } from '@adonisjs/core/http'
import RecruitmentContactService from '#services/recruitment_contact_service'
import {
  createRecruitmentContactValidator,
  updateRecruitmentContactValidator,
} from '#validators/recruitment_contact_validator'

export default class RecruitmentContactsController {
  private readonly service = new RecruitmentContactService()

  async index({ auth, params, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const contacts = await this.service.listContacts(params.id, user.id)
    response.ok({ data: contacts })
  }

  async store({ auth, params, request, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createRecruitmentContactValidator)

    try {
      const contact = await this.service.createContact(params.id, user.id, payload)
      response.created({ data: contact })
    } catch (error: unknown) {
      const err = error as Error & { code?: string }
      if (err.code === 'DUPLICATE_CONTACT') {
        response.conflict({ error: err.message })
        return
      }
      throw error
    }
  }

  async update({ auth, params, request, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(updateRecruitmentContactValidator)

    const contact = await this.service.updateContact(
      params.id,
      params.contactId,
      user.id,
      payload
    )
    response.ok({ data: contact })
  }

  async destroy({ auth, params, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    await this.service.removeContact(params.id, params.contactId, user.id)
    response.noContent()
  }

  async reProspect({ auth, params, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()

    try {
      await this.service.reProspect(params.id, params.contactId, user.id)
      response.ok({ message: 'Lead returned to pipeline' })
    } catch (error: unknown) {
      const err = error as Error & { code?: string }
      if (err.code === 'NO_LINKED_LEAD') {
        response.unprocessableEntity({ error: err.message })
        return
      }
      throw error
    }
  }
}
