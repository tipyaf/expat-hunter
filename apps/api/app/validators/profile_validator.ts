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
    followUps: vine
      .array(
        vine.object({
          delay: vine.number().min(1).max(365),
          unit: vine.enum(['days', 'weeks', 'months'] as const),
        })
      )
      .optional(),
    sendingSchedule: vine
      .object({
        allowedDays: vine.array(vine.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const)),
        startHour: vine.number().min(0).max(23.75),
        endHour: vine.number().min(0).max(23.75),
        timezone: vine.string().trim().minLength(1),
      })
      .optional(),
  }),
)
