import type { HttpContext } from '@adonisjs/core/http'
import PDFDocument from 'pdfkit'
import JobCvGenerationService from '#services/job_cv_generation_service'
import JobCoverLetterService from '#services/job_cover_letter_service'
import {
  refineCvValidator,
  saveCvTextValidator,
  refineCoverLetterValidator,
  saveCoverLetterTextValidator,
} from '#validators/job_application_validator'
import JobOffer from '#models/job_offer'
import type { UserPlan } from '@expat-hunter/shared'

const PDF_FONT_SIZE = 11
const PDF_MARGIN = 50
const PDF_LINE_GAP = 4

export default class JobApplicationsController {
  private readonly cvService = new JobCvGenerationService()
  private readonly coverLetterService = new JobCoverLetterService()

  async generate({ auth, params, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id

    await this.verifyOfferOwnership(offerId, user.id)

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
      this.handleServiceError(error, response)
    }
  }

  async refine({ auth, params, request, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id
    const payload = await request.validateUsing(refineCvValidator)

    await this.verifyOfferOwnership(offerId, user.id)

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
      this.handleServiceError(error, response)
    }
  }

  async save({ auth, params, request, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id
    const payload = await request.validateUsing(saveCvTextValidator)

    await this.verifyOfferOwnership(offerId, user.id)

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
      this.handleServiceError(error, response)
    }
  }

  async pdf({ auth, params, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id

    await this.verifyOfferOwnership(offerId, user.id)

    const application = await this.cvService.getApplication(offerId, user.id)

    if (!application?.cvText) {
      response.badRequest({
        error: { code: 'NO_CV_TEXT', message: 'Generate or edit your CV first.' },
      })
      return
    }

    const doc = new PDFDocument({
      size: 'A4',
      margin: PDF_MARGIN,
      info: {
        Title: 'CV — ExpatHunter',
        Author: 'ExpatHunter',
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    await new Promise<void>((resolve, reject) => {
      doc.on('end', resolve)
      doc.on('error', reject)

      doc.fontSize(PDF_FONT_SIZE)
      doc.font('Helvetica')

      const lines = application.cvText!.split('\n')
      for (const line of lines) {
        doc.text(line, { lineGap: PDF_LINE_GAP })
      }

      doc.end()
    })

    const pdfBuffer = Buffer.concat(chunks)

    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', 'attachment; filename="cv-expathunter.pdf"')
    response.header('Content-Length', String(pdfBuffer.length))
    response.send(pdfBuffer)
  }

  async show({ auth, params, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id

    await this.verifyOfferOwnership(offerId, user.id)

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

  async generateCoverLetter({ auth, params, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id

    await this.verifyOfferOwnership(offerId, user.id)

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
      this.handleServiceError(error, response)
    }
  }

  async refineCoverLetter({ auth, params, request, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id
    const payload = await request.validateUsing(refineCoverLetterValidator)

    await this.verifyOfferOwnership(offerId, user.id)

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
      this.handleServiceError(error, response)
    }
  }

  async saveCoverLetter({ auth, params, request, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id
    const payload = await request.validateUsing(saveCoverLetterTextValidator)

    await this.verifyOfferOwnership(offerId, user.id)

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
      this.handleServiceError(error, response)
    }
  }

  async coverLetterPdf({ auth, params, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id

    await this.verifyOfferOwnership(offerId, user.id)

    const application = await this.coverLetterService.getCoverLetterApplication(offerId, user.id)

    if (!application?.coverLetterText) {
      response.badRequest({
        error: { code: 'NO_COVER_LETTER', message: 'Generate or edit your cover letter first.' },
      })
      return
    }

    const doc = new PDFDocument({
      size: 'A4',
      margin: PDF_MARGIN,
      info: {
        Title: 'Cover Letter — ExpatHunter',
        Author: 'ExpatHunter',
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    await new Promise<void>((resolve, reject) => {
      doc.on('end', resolve)
      doc.on('error', reject)

      doc.fontSize(PDF_FONT_SIZE)
      doc.font('Helvetica')

      const lines = application.coverLetterText!.split('\n')
      for (const line of lines) {
        doc.text(line, { lineGap: PDF_LINE_GAP })
      }

      doc.end()
    })

    const pdfBuffer = Buffer.concat(chunks)

    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', 'attachment; filename="cover-letter-expathunter.pdf"')
    response.header('Content-Length', String(pdfBuffer.length))
    response.send(pdfBuffer)
  }

  async showCoverLetter({ auth, params, response }: HttpContext): Promise<void> {
    const user = auth.getUserOrFail()
    const offerId = params.id

    await this.verifyOfferOwnership(offerId, user.id)

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

  private async verifyOfferOwnership(offerId: string, userId: string): Promise<void> {
    const offer = await JobOffer.query()
      .where('id', offerId)
      .preload('search')
      .firstOrFail()

    if (offer.search.userId !== userId) {
      const error = new Error('Job offer not found')
      ;(error as Error & { code: string }).code = 'E_ROW_NOT_FOUND'
      throw error
    }
  }

  private handleServiceError(error: unknown, response: HttpContext['response']): void {
    const typedError = error as Error & { code?: string; status?: number }

    if (typedError.code === 'QUOTA_EXCEEDED') {
      response.forbidden({
        error: { code: 'QUOTA_EXCEEDED', message: typedError.message },
      })
      return
    }

    if (typedError.code === 'NO_CV') {
      response.badRequest({
        error: { code: 'NO_CV', message: typedError.message },
      })
      return
    }

    if (typedError.code === 'NO_COVER_LETTER') {
      response.badRequest({
        error: { code: 'NO_COVER_LETTER', message: typedError.message },
      })
      return
    }

    if (typedError.code === 'AI_ERROR') {
      response.serviceUnavailable({
        error: { code: 'AI_ERROR', message: typedError.message },
      })
      return
    }

    if (typedError.code === 'E_ROW_NOT_FOUND') {
      response.notFound({
        error: { code: 'NOT_FOUND', message: 'Resource not found.' },
      })
      return
    }

    throw error
  }
}
