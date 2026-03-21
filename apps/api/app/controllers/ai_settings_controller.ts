import type { HttpContext } from '@adonisjs/core/http'
import type { FeatureKey } from '#models/ai_setting'
import User from '#models/user'
import AiSettingsService from '#services/ai_settings_service'
import { upsertAiSettingValidator, toggleAdminValidator } from '#validators/ai_settings_validator'

const VALID_KEYS: FeatureKey[] = ['default', 'cv_extraction', 'relevance_analysis', 'email_generation']

export default class AiSettingsController {
  async index({ response }: HttpContext) {
    const settings = await AiSettingsService.getAll()
    return response.ok({ data: settings })
  }

  async upsert({ params, request, response }: HttpContext) {
    const key = params.key as string

    if (!VALID_KEYS.includes(key as FeatureKey)) {
      return response.badRequest({
        error: { code: 'INVALID_KEY', message: `Key must be one of: ${VALID_KEYS.join(', ')}` },
      })
    }

    const data = await request.validateUsing(upsertAiSettingValidator)

    const setting = await AiSettingsService.upsert(key as FeatureKey, {
      model: data.model,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      isEnabled: data.isEnabled,
    })

    return response.ok({ data: setting })
  }

  async listUsers({ response }: HttpContext) {
    const users = await User.query()
      .select('id', 'email', 'fullName', 'isAdmin', 'createdAt')
      .orderBy('createdAt', 'asc')
      .limit(200)

    return response.ok({
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt,
      })),
    })
  }

  async toggleAdmin({ params, request, response }: HttpContext) {
    const data = await request.validateUsing(toggleAdminValidator)

    const user = await User.find(params.id)
    if (!user) {
      return response.notFound({
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      })
    }

    user.isAdmin = data.isAdmin
    await user.save()

    return response.ok({
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isAdmin: user.isAdmin,
      },
    })
  }
}
