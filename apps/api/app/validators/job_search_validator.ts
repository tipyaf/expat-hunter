import vine from '@vinejs/vine'
import {
  SENIORITY_VALUES,
  SUPPORTED_PLATFORMS,
  FREQUENCY_VALUES,
  MAX_ROLES_PER_SEARCH,
  MAX_ROLE_LENGTH,
} from '@expat-hunter/shared'

const CONTRACT_TYPE_VALUES = ['permanent', 'contract', 'any'] as const

export const createJobSearchValidator = vine.compile(
  vine.object({
    roles: vine
      .array(vine.string().trim().minLength(1).maxLength(MAX_ROLE_LENGTH))
      .minLength(1)
      .maxLength(MAX_ROLES_PER_SEARCH),
    countries: vine
      .array(vine.string().trim().minLength(2).maxLength(3))
      .minLength(1),
    cities: vine.array(vine.string().trim().minLength(1).maxLength(100)).optional(),
    platforms: vine
      .array(vine.enum(SUPPORTED_PLATFORMS))
      .minLength(1),
    seniority: vine.enum(SENIORITY_VALUES),
    sector: vine.string().trim().maxLength(100).optional(),
    skills: vine.array(vine.string().trim().minLength(1).maxLength(100)).optional(),
    salaryMin: vine.number().min(0).optional(),
    salaryMax: vine.number().min(0).optional(),
    contractType: vine.enum(CONTRACT_TYPE_VALUES).optional(),
    frequency: vine.enum(FREQUENCY_VALUES).optional(),
  })
)

export const updateJobSearchValidator = vine.compile(
  vine.object({
    roles: vine
      .array(vine.string().trim().minLength(1).maxLength(MAX_ROLE_LENGTH))
      .minLength(1)
      .maxLength(MAX_ROLES_PER_SEARCH)
      .optional(),
    countries: vine
      .array(vine.string().trim().minLength(2).maxLength(3))
      .minLength(1)
      .optional(),
    cities: vine.array(vine.string().trim().minLength(1).maxLength(100)).optional().nullable(),
    platforms: vine
      .array(vine.enum(SUPPORTED_PLATFORMS))
      .minLength(1)
      .optional(),
    seniority: vine.enum(SENIORITY_VALUES).optional(),
    sector: vine.string().trim().maxLength(100).optional().nullable(),
    skills: vine.array(vine.string().trim().minLength(1).maxLength(100)).optional().nullable(),
    salaryMin: vine.number().min(0).optional().nullable(),
    salaryMax: vine.number().min(0).optional().nullable(),
    contractType: vine.enum(CONTRACT_TYPE_VALUES).optional().nullable(),
    frequency: vine.enum(FREQUENCY_VALUES).optional(),
  })
)
