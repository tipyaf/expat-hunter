import type { HttpContext } from '@adonisjs/core/http'
import JobCoverLetterService from '#services/job_cover_letter_service'
import PdfService from '#services/pdf_service'
import {
  refineCoverLetterValidator,
  saveCoverLetterTextValidator,
} from '#validators/job_application_validator'
import {
  handleServiceError,
  verifyOfferOwnership,
} from '#controllers/concerns/application_error_handler'
import type { UserPlan } from '@expat-hunter/shared'

export default class JobCoverLetterController {
  private readonly coverLetterService = new JobCoverLetterService()
  private readonly pdfService = new PdfService()

  async showCoverLetter({ auth, params, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id

    await verifyOfferOwnership(offerId, user.id)

    const application = await this.coverLetterService.getCoverLetterApplication(offerId, user.id)

    if (!application) {
      response.ok({ data: null })
      return
    }

    response.ok({
      data: {
        applicationId: application.id,
        coverLetterText: application.coverLetterText,
        language: application.language,
        status: application.status,
      },
    })
  }

  async generateCoverLetter({ auth, params, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id

    await verifyOfferOwnership(offerId, user.id)

    try {
      const result = await this.coverLetterService.generateCoverLetter(
        offerId,
        user.id,
        (user as unknown as { plan: UserPlan }).plan ?? 'free'
      )

      response.ok({
        data: {
          applicationId: result.application.id,
          coverLetterText: result.coverLetterText,
          language: result.application.language,
          status: result.application.status,
        },
      })
    } catch (error: unknown) {
      handleServiceError(error, response)
    }
  }

  async refineCoverLetter({ auth, params, request, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id
    const payload = await request.validateUsing(refineCoverLetterValidator)

    await verifyOfferOwnership(offerId, user.id)

    try {
      const result = await this.coverLetterService.refineCoverLetter(
        offerId,
        user.id,
        payload.instruction
      )

      response.ok({
        data: {
          applicationId: result.application.id,
          coverLetterText: result.coverLetterText,
          language: result.application.language,
          status: result.application.status,
        },
      })
    } catch (error: unknown) {
      handleServiceError(error, response)
    }
  }

  async saveCoverLetter({ auth, params, request, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id
    const payload = await request.validateUsing(saveCoverLetterTextValidator)

    await verifyOfferOwnership(offerId, user.id)

    try {
      const application = await this.coverLetterService.saveCoverLetterText(
        offerId,
        user.id,
        payload.coverLetterText
      )

      response.ok({
        data: {
          applicationId: application.id,
          coverLetterText: application.coverLetterText,
          language: application.language,
          status: application.status,
        },
      })
    } catch (error: unknown) {
      handleServiceError(error, response)
    }
  }

  async coverLetterPdf({ auth, params, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id

    await verifyOfferOwnership(offerId, user.id)

    const application = await this.coverLetterService.getCoverLetterApplication(offerId, user.id)

    if (!application?.coverLetterText) {
      response.badRequest({
        error: { code: 'NO_COVER_LETTER', message: 'Generate or edit your cover letter first.' },
      })
      return
    }

    const pdfBuffer = await this.pdfService.textToBuffer(
      application.coverLetterText,
      'Cover Letter — ExpatHunter'
    )

    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', 'attachment; filename="cover-letter-expathunter.pdf"')
    response.header('Content-Length', String(pdfBuffer.length))
    response.send(pdfBuffer)
  }
}
