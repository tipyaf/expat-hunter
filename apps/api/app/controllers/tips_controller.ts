import type { HttpContext } from '@adonisjs/core/http'
import DashboardService from '#services/dashboard_service'
import TipsService from '#services/tips_service'

export default class TipsController {
  private dashboardService = new DashboardService()
  private tipsService = new TipsService()

  async contextual({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const page = request.input('page', 'dashboard') as string
    const status = request.input('status', null) as string | null

    if (page === 'kanban') {
      const tip = this.tipsService.getKanbanTip(status)
      return response.ok({ data: tip })
    }

    // Default: dashboard
    const stats = await this.dashboardService.getStats(user.id)
    const tip = this.tipsService.getDashboardTip(stats)
    return response.ok({ data: tip })
  }
}
