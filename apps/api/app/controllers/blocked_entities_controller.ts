import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import ContactMovementService from '#services/contact_movement_service'

const blockValidator = vine.compile(
  vine.object({
    entityType: vine.enum(['contact', 'company']),
    entityId: vine.string().uuid(),
    reason: vine.string().optional(),
    durationDays: vine.number().positive().optional(),
  })
)

export default class BlockedEntitiesController {
  private movementService = new ContactMovementService()

  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const blocked = await this.movementService.getBlocked(user.id)
    return response.ok({
      data: blocked.map((b) => ({
        id: b.id,
        entityType: b.entityType,
        entityId: b.entityId,
        reason: b.reason,
        blockedUntil: b.blockedUntil?.toISO() ?? null,
        createdAt: b.createdAt.toISO(),
      })),
    })
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(blockValidator)
    const block = await this.movementService.block(
      user.id,
      payload.entityType,
      payload.entityId,
      payload.reason,
      payload.durationDays
    )
    return response.created({
      data: {
        id: block.id,
        entityType: block.entityType,
        entityId: block.entityId,
        reason: block.reason,
        blockedUntil: block.blockedUntil?.toISO() ?? null,
      },
    })
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    await this.movementService.unblock(user.id, params.id)
    return response.noContent()
  }
}
