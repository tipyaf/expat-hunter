import vine from '@vinejs/vine'

export const updateProfileValidator = vine.compile(
  vine.object({
    skills: vine.array(vine.string().trim().minLength(1).maxLength(100)).optional(),
    experienceYears: vine.number().min(0).max(50).optional(),
    targetCountries: vine.array(vine.string().trim().minLength(2).maxLength(3)).optional(),
    targetSectors: vine.array(vine.string().trim().minLength(1).maxLength(100)).optional(),
    targetRoles: vine.array(vine.string().trim().minLength(1).maxLength(100)).optional(),
    preferences: vine.object({}).allowUnknownProperties().optional(),
    cvText: vine.string().trim().optional(),
  }),
)
