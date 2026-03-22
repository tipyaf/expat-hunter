import type { HttpContext } from '@adonisjs/core/http'
import SendingSettingsService from '#services/sending_settings_service'

export default class SendingSettingsController {
  /**
   * GET /api/sending-settings — Get user's sending settings + admin limits.
   */
  async show({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const service = new SendingSettingsService()
    const settings = await service.getForUser(user.id)

    return response.ok({ data: settings })
  }

  /**
   * PATCH /api/admin/settings/emails — Admin: update email sending limits.
   */
  async updateAdminLimits({ request, response }: HttpContext) {
    const { maxFollowUps, minFollowUpDelay, minFollowUpDelayUnit } = request.only([
      'maxFollowUps', 'minFollowUpDelay', 'minFollowUpDelayUnit',
    ])

    const VALID_UNITS = ['days', 'weeks', 'months']
    if (minFollowUpDelayUnit && !VALID_UNITS.includes(minFollowUpDelayUnit)) {
      return response.unprocessableEntity({
        error: { code: 'INVALID_UNIT', message: `minFollowUpDelayUnit must be one of: ${VALID_UNITS.join(', ')}` },
      })
    }
    if (maxFollowUps !== undefined && (maxFollowUps < 0 || maxFollowUps > 10)) {
      return response.unprocessableEntity({
        error: { code: 'INVALID_VALUE', message: 'maxFollowUps must be between 0 and 10' },
      })
    }

    const service = new SendingSettingsService()
    const updated = await service.updateAdminLimits({
      maxFollowUps,
      minFollowUpDelay,
      minFollowUpDelayUnit,
    })

    return response.ok({ data: updated })
  }
}
