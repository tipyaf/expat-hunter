import vine from '@vinejs/vine'

export const createRecruitmentContactValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(255),
    role: vine.string().trim().maxLength(255).optional(),
    email: vine.string().trim().email().maxLength(255).optional(),
    linkedinUrl: vine.string().trim().url().maxLength(500).optional(),
    notes: vine.string().trim().maxLength(5000).optional(),
  })
)

export const updateRecruitmentContactValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(255).optional(),
    role: vine.string().trim().maxLength(255).nullable().optional(),
    email: vine.string().trim().email().maxLength(255).nullable().optional(),
    linkedinUrl: vine.string().trim().url().maxLength(500).nullable().optional(),
    notes: vine.string().trim().maxLength(5000).nullable().optional(),
  })
)
