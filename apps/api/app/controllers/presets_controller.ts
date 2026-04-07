import type { HttpContext } from '@adonisjs/core/http'
import GenerationPreset from '#models/generation_preset'

const VALID_LENGTHS = ['short', 'medium', 'long'] as const
const VALID_FRAMEWORKS = ['aida', 'pas', 'bab', 'direct'] as const
const MAX_CUSTOM_INSTRUCTIONS_LENGTH = 500

type FieldValidationError = {
  code: string
  message: string
} | null

function validatePresetFields(
  length: string | undefined,
  framework: string | undefined,
  customInstructions: string | undefined,
  strictUndefinedCheck: boolean
): FieldValidationError {
  const shouldValidateLength = strictUndefinedCheck ? length !== undefined : !!length
  if (shouldValidateLength && !(VALID_LENGTHS as readonly string[]).includes(length!)) {
    return { code: 'INVALID_LENGTH', message: `length must be one of: ${VALID_LENGTHS.join(', ')}` }
  }
  const shouldValidateFramework = strictUndefinedCheck ? framework !== undefined : !!framework
  if (shouldValidateFramework && !(VALID_FRAMEWORKS as readonly string[]).includes(framework!)) {
    return { code: 'INVALID_FRAMEWORK', message: `framework must be one of: ${VALID_FRAMEWORKS.join(', ')}` }
  }
  if (typeof customInstructions === 'string' && customInstructions.length > MAX_CUSTOM_INSTRUCTIONS_LENGTH) {
    return { code: 'INSTRUCTIONS_TOO_LONG', message: `customInstructions must be ${MAX_CUSTOM_INSTRUCTIONS_LENGTH} characters or less` }
  }
  return null
}

const UPDATABLE_FIELDS = ['name', 'length', 'framework', 'tone', 'language', 'customInstructions', 'isDefault'] as const

export default class PresetsController {
  /**
   * GET /api/presets — List user's generation presets.
   */
  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const presets = await GenerationPreset.query()
      .where('userId', user.id)
      .orderBy('isDefault', 'desc')
      .orderBy('createdAt', 'desc')

    return response.ok({ data: presets.map((p) => this.serialize(p)) })
  }

  /**
   * POST /api/presets — Create a new generation preset.
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { name, length, framework, tone, language, customInstructions, isDefault } = request.only([
      'name', 'length', 'framework', 'tone', 'language', 'customInstructions', 'isDefault',
    ])

    if (!name) {
      return response.unprocessableEntity({
        error: { code: 'MISSING_FIELDS', message: 'name is required' },
      })
    }
    const validationError = validatePresetFields(length, framework, customInstructions, false)
    if (validationError) {
      return response.unprocessableEntity({ error: validationError })
    }

    if (isDefault) {
      await GenerationPreset.query()
        .where('userId', user.id)
        .where('isDefault', true)
        .update({ isDefault: false })
    }

    const preset = await GenerationPreset.create({
      userId: user.id,
      name,
      length: length ?? 'medium',
      framework: framework ?? 'direct',
      tone: tone ?? 'professional',
      language: language ?? 'fr',
      customInstructions: customInstructions ?? null,
      isDefault: isDefault ?? false,
    })

    return response.created({ data: this.serialize(preset) })
  }

  /**
   * PUT /api/presets/:id — Update a preset.
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const preset = await GenerationPreset.query()
      .where('id', params.id)
      .where('userId', user.id)
      .first()

    if (!preset) {
      return response.notFound({ error: { code: 'PRESET_NOT_FOUND', message: 'Preset not found' } })
    }

    const fields = request.only([
      'name', 'length', 'framework', 'tone', 'language', 'customInstructions', 'isDefault',
    ])

    const validationError = validatePresetFields(fields.length, fields.framework, fields.customInstructions, true)
    if (validationError) {
      return response.unprocessableEntity({ error: validationError })
    }

    if (fields.isDefault && !preset.isDefault) {
      await GenerationPreset.query()
        .where('userId', user.id)
        .where('isDefault', true)
        .update({ isDefault: false })
    }

    for (const key of UPDATABLE_FIELDS) {
      if (fields[key] !== undefined) {
        ;(preset as unknown as Record<string, unknown>)[key] = fields[key]
      }
    }

    await preset.save()
    return response.ok({ data: this.serialize(preset) })
  }

  /**
   * DELETE /api/presets/:id — Delete a preset.
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const preset = await GenerationPreset.query()
      .where('id', params.id)
      .where('userId', user.id)
      .first()

    if (!preset) {
      return response.notFound({ error: { code: 'PRESET_NOT_FOUND', message: 'Preset not found' } })
    }

    await preset.delete()
    return response.ok({ data: { deleted: true } })
  }

  private serialize(preset: GenerationPreset) {
    return {
      id: preset.id,
      name: preset.name,
      length: preset.length,
      framework: preset.framework,
      tone: preset.tone,
      language: preset.language,
      customInstructions: preset.customInstructions,
      isDefault: preset.isDefault,
      createdAt: preset.createdAt,
      updatedAt: preset.updatedAt,
    }
  }
}
