import type { HttpContext } from '@adonisjs/core/http'
import DashboardService from '#services/dashboard_service'

export default class DashboardController {
  private service = new DashboardService()

  async actions({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const actions = await this.service.getActions(user.id)
    return response.ok({ data: actions })
  }

  async stats({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const stats = await this.service.getStats(user.id)
    return response.ok({ data: stats })
  }
}
