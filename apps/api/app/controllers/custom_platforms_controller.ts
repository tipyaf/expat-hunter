import type { HttpContext } from '@adonisjs/core/http'
import CustomPlatformService from '#services/custom_platform_service'
import { createCustomPlatformValidator } from '#validators/custom_platform_validator'
import type { UserPlan } from '@expat-hunter/shared'

export default class CustomPlatformsController {
  private readonly service = new CustomPlatformService()

  /**
   * GET /api/custom-platforms — list user's custom platforms.
   */
  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const platforms = await this.service.list(user.id)
    return response.json({ data: platforms })
  }

  /**
   * POST /api/custom-platforms — create a custom platform.
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createCustomPlatformValidator)
    const platform = await this.service.create(
      user.id,
      user.plan as UserPlan,
      payload
    )
    return response.status(201).json({ data: platform })
  }

  /**
   * DELETE /api/custom-platforms/:id — remove a custom platform.
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    await this.service.remove(user.id, params.id)
    return response.status(204).send('')
  }

  /**
   * GET /api/platforms/suggestions?country=NZ — get suggestions for a country.
   */
  async suggestions({ request, response }: HttpContext) {
    const country = request.input('country', '') as string
    if (!country) {
      return response.json({ data: [] })
    }
    const suggestions = this.service.getSuggestions(country)
    return response.json({ data: suggestions })
  }
}
