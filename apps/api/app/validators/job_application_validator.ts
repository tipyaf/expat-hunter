import vine from '@vinejs/vine'

export const refineCvValidator = vine.compile(
  vine.object({
    instruction: vine.string().trim().minLength(1).maxLength(2000),
  })
)

export const saveCvTextValidator = vine.compile(
  vine.object({
    cvText: vine.string().trim().minLength(1).maxLength(50000),
  })
)

export const refineCoverLetterValidator = vine.compile(
  vine.object({
    instruction: vine.string().trim().minLength(1).maxLength(2000),
  })
)

export const saveCoverLetterTextValidator = vine.compile(
  vine.object({
    coverLetterText: vine.string().trim().minLength(1).maxLength(50000),
  })
)

export const sendApplicationValidator = vine.compile(
  vine.object({
    recipientEmail: vine.string().trim().email().maxLength(255),
  })
)

export const draftFollowUpEmailValidator = vine.compile(
  vine.object({
    type: vine.enum(['follow_up', 'thank_you', 'status_check']),
    context: vine.string().trim().minLength(1).maxLength(2000),
  })
)
