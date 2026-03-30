import type { HttpContext } from '@adonisjs/core/http'
import DashboardService from '#services/dashboard_service'
import ProfileService from '#services/profile_service'
import TipsService from '#services/tips_service'

export default class TipsController {
  private dashboardService = new DashboardService()
  private profileService = new ProfileService()
  private tipsService = new TipsService()

  async contextual({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const page = request.input('page', 'dashboard') as string
    const status = request.input('status', null) as string | null
    const country = request.input('country', null) as string | null
    const contactId = request.input('contactId', null) as string | null
    const locale = user.locale ?? 'fr'

    if (page === 'kanban') {
      const tip = await this.tipsService.getKanbanTip(status, locale)
      return response.ok({ data: tip })
    }

    if (page === 'thread') {
      const tip = await this.tipsService.getThreadTip(
        contactId ?? undefined,
        country ?? undefined,
        locale
      )
      return response.ok({ data: tip })
    }

    if (page === 'profile') {
      const profile = await this.profileService.getOrCreateProfile(user)
      const tip = await this.tipsService.getProfileTip(
        {
          skills: profile.skills,
          experienceYears: profile.experienceYears,
          targetCountries: profile.targetCountries,
        },
        locale
      )
      return response.ok({ data: tip })
    }

    // Default: dashboard
    const stats = await this.dashboardService.getStats(user.id)
    const tip = await this.tipsService.getDashboardTip(stats, locale)
    return response.ok({ data: tip })
  }
}
