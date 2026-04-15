import type { HttpContext } from '@adonisjs/core/http'
import JobApplicationSendService from '#services/job_application_send_service'
import { sendApplicationValidator, draftFollowUpEmailValidator } from '#validators/job_application_validator'
import { handleServiceError } from '#controllers/concerns/application_error_handler'
import type { UserPlan } from '@expat-hunter/shared'

export default class JobApplicationSendController {
  private readonly sendService = new JobApplicationSendService()

  async applicationEmailStatus({ auth, params, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id

    try {
      const status = await this.sendService.getApplicationEmailStatus(offerId, user.id)
      response.ok({ data: status })
    } catch (error: unknown) {
      handleServiceError(error, response)
    }
  }

  async generateApplicationEmail({ auth, params, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id

    try {
      const result = await this.sendService.generateApplicationEmail(
        offerId,
        user.id,
        (user as unknown as { plan: UserPlan }).plan ?? 'free'
      )

      response.ok({
        data: {
          applicationId: result.application.id,
          emailText: result.emailText,
          status: result.application.status,
        },
      })
    } catch (error: unknown) {
      handleServiceError(error, response)
    }
  }

  async sendApplication({ auth, params, request, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id
    const payload = await request.validateUsing(sendApplicationValidator)

    try {
      const result = await this.sendService.sendApplication(
        offerId,
        user.id,
        payload.recipientEmail
      )

      response.ok({
        data: {
          applicationId: result.application.id,
          status: result.application.status,
          sentAt: result.application.sentAt?.toISO() ?? null,
          sentToEmail: result.application.sentToEmail,
        },
      })
    } catch (error: unknown) {
      handleServiceError(error, response)
    }
  }

  async draftFollowUpEmail({ auth, params, request, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id
    const contactId = params.contactId
    const payload = await request.validateUsing(draftFollowUpEmailValidator)

    try {
      const result = await this.sendService.draftFollowUpEmail(
        offerId,
        contactId,
        user.id,
        payload.type,
        payload.context
      )

      response.ok({ data: { emailText: result.emailText } })
    } catch (error: unknown) {
      handleServiceError(error, response)
    }
  }
}
