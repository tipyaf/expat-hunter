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
