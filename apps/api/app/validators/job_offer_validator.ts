import vine from '@vinejs/vine'
import { EXCLUSION_CATEGORIES } from '@expat-hunter/shared'

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
