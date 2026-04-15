import type { HttpContext } from '@adonisjs/core/http'
import JobCvGenerationService from '#services/job_cv_generation_service'
import PdfService from '#services/pdf_service'
import { refineCvValidator, saveCvTextValidator } from '#validators/job_application_validator'
import {
  handleServiceError,
  verifyOfferOwnership,
} from '#controllers/concerns/application_error_handler'
import type { UserPlan } from '@expat-hunter/shared'

export default class JobCvController {
  private readonly cvService = new JobCvGenerationService()
  private readonly pdfService = new PdfService()

  async show({ auth, params, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id

    await verifyOfferOwnership(offerId, user.id)

    const application = await this.cvService.getApplication(offerId, user.id)

    if (!application) {
      response.ok({ data: null })
      return
    }

    response.ok({
      data: {
        applicationId: application.id,
        cvText: application.cvText,
        cvReplacements: application.cvReplacements,
        language: application.language,
        status: application.status,
      },
    })
  }

  async generate({ auth, params, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id

    await verifyOfferOwnership(offerId, user.id)

    try {
      const result = await this.cvService.generateCv(
        offerId,
        user.id,
        (user as unknown as { plan: UserPlan }).plan ?? 'free'
      )

      response.ok({
        data: {
          applicationId: result.application.id,
          cvText: result.application.cvText,
          cvReplacements: result.cvReplacements,
          language: result.application.language,
          status: result.application.status,
        },
      })
    } catch (error: unknown) {
      handleServiceError(error, response)
    }
  }

  async refine({ auth, params, request, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id
    const payload = await request.validateUsing(refineCvValidator)

    await verifyOfferOwnership(offerId, user.id)

    try {
      const result = await this.cvService.refineCv(offerId, user.id, payload.instruction)

      response.ok({
        data: {
          applicationId: result.application.id,
          cvText: result.application.cvText,
          cvReplacements: result.cvReplacements,
          language: result.application.language,
          status: result.application.status,
        },
      })
    } catch (error: unknown) {
      handleServiceError(error, response)
    }
  }

  async save({ auth, params, request, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id
    const payload = await request.validateUsing(saveCvTextValidator)

    await verifyOfferOwnership(offerId, user.id)

    try {
      const application = await this.cvService.saveCvText(offerId, user.id, payload.cvText)

      response.ok({
        data: {
          applicationId: application.id,
          cvText: application.cvText,
          cvReplacements: application.cvReplacements,
          language: application.language,
          status: application.status,
        },
      })
    } catch (error: unknown) {
      handleServiceError(error, response)
    }
  }

  async pdf({ auth, params, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id

    await verifyOfferOwnership(offerId, user.id)

    const application = await this.cvService.getApplication(offerId, user.id)

    if (!application?.cvText) {
      response.badRequest({
        error: { code: 'NO_CV_TEXT', message: 'Generate or edit your CV first.' },
      })
      return
    }

    const pdfBuffer = await this.pdfService.textToBuffer(application.cvText, 'CV — ExpatHunter')

    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', 'attachment; filename="cv-expathunter.pdf"')
    response.header('Content-Length', String(pdfBuffer.length))
    response.send(pdfBuffer)
  }
}
