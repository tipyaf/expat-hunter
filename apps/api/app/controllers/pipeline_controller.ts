import type { HttpContext } from '@adonisjs/core/http'
import PipelineService from '#services/pipeline_service'

export default class PipelineController {
  /**
   * GET /api/pipeline — Get kanban board data.
   */
  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const service = new PipelineService()
    const board = await service.getBoard(user.id)

    return response.ok({ data: board })
  }

  /**
   * GET /api/pipeline/stats — Get pipeline stats by status.
   */
  async stats({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const service = new PipelineService()
    const stats = await service.getStats(user.id)

    return response.ok({ data: stats })
  }
}
