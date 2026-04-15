import type { HttpContext } from '@adonisjs/core/http'
import JobOffer from '#models/job_offer'

type ResponseMethod = 'forbidden' | 'badRequest' | 'serviceUnavailable' | 'notFound'

interface ErrorMapping {
  method: ResponseMethod
  code: string
}

const ERROR_MAP: Record<string, ErrorMapping> = {
  QUOTA_EXCEEDED: { method: 'forbidden', code: 'QUOTA_EXCEEDED' },
  NO_CV: { method: 'badRequest', code: 'NO_CV' },
  NO_COVER_LETTER: { method: 'badRequest', code: 'NO_COVER_LETTER' },
  NO_APPLICATION_EMAIL: { method: 'badRequest', code: 'NO_APPLICATION_EMAIL' },
  NO_EMAIL_CONNECTION: { method: 'badRequest', code: 'NO_EMAIL_CONNECTION' },
  CONTACT_NO_EMAIL: { method: 'badRequest', code: 'CONTACT_NO_EMAIL' },
  EMAIL_SEND_FAILED: { method: 'serviceUnavailable', code: 'EMAIL_SEND_FAILED' },
  AI_ERROR: { method: 'serviceUnavailable', code: 'AI_ERROR' },
  E_ROW_NOT_FOUND: { method: 'notFound', code: 'NOT_FOUND' },
}

export function handleServiceError(error: unknown, response: HttpContext['response']): void {
  const typedError = error as Error & { code?: string }
  const mapping = typedError.code ? ERROR_MAP[typedError.code] : undefined

  if (mapping) {
    response[mapping.method]({
      error: { code: mapping.code, message: typedError.message },
    })
    return
  }

  throw error
}

export async function verifyOfferOwnership(offerId: string, userId: string): Promise<void> {
  const offer = await JobOffer.query().where('id', offerId).preload('search').firstOrFail()

  if (offer.search.userId !== userId) {
    const error = new Error('Job offer not found')
    ;(error as Error & { code: string }).code = 'E_ROW_NOT_FOUND'
    throw error
  }
}
