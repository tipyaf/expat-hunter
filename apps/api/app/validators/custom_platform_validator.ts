import vine from '@vinejs/vine'

/**
 * Validates custom platform creation payload.
 * URL must be http/https — no javascript:, data:, or other protocols.
 */
export const createCustomPlatformValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(255),
    url: vine
      .string()
      .trim()
      .maxLength(2048)
      .url()
      .regex(/^https?:\/\//),
    country: vine.string().trim().maxLength(10).optional(),
  })
)
