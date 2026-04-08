import vine from '@vinejs/vine'
import { EXCLUSION_CATEGORIES, JOB_OFFER_STATUSES } from '@expat-hunter/shared'

export const excludeJobOfferValidator = vine.compile(
  vine.object({
    category: vine.enum(EXCLUSION_CATEGORIES),
    reason: vine.string().trim().maxLength(500).optional(),
  })
)

export const updateAdviceValidator = vine.compile(
  vine.object({
    applicationAdvice: vine.string().trim().minLength(1).maxLength(2000),
  })
)

export const updateStatusValidator = vine.compile(
  vine.object({
    status: vine.enum(JOB_OFFER_STATUSES),
  })
)
