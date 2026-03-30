import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim().toLowerCase(),
    password: vine.string().minLength(8),
    fullName: vine.string().trim().minLength(1).maxLength(255),
    locale: vine.string().trim().optional(),
    website: vine.string().trim().optional(),
  }),
)

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim().toLowerCase(),
    password: vine.string(),
  }),
)
