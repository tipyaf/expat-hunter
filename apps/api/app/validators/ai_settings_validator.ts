import vine from '@vinejs/vine'

export const upsertAiSettingValidator = vine.compile(
  vine.object({
    model: vine.string().trim().minLength(1).maxLength(100).optional(),
    temperature: vine.number().min(0).max(2).optional(),
    maxTokens: vine.number().min(128).max(8192).optional(),
    isEnabled: vine.boolean().optional(),
  })
)

export const toggleAdminValidator = vine.compile(
  vine.object({
    isAdmin: vine.boolean(),
  })
)

export const togglePlanValidator = vine.compile(
  vine.object({
    plan: vine.enum(['free', 'premium']),
  })
)
