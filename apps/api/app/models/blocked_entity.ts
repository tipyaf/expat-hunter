import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'

export type BlockedEntityType = 'contact' | 'company'

export default class BlockedEntity extends BaseModel {
  static table = 'blocked_entities'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare entityType: BlockedEntityType

  @column()
  declare entityId: string

  @column.dateTime()
  declare blockedUntil: DateTime | null

  @column()
  declare reason: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(entity: BlockedEntity) {
    entity.id = randomUUID()
  }

  get isActive(): boolean {
    if (!this.blockedUntil) return true
    return this.blockedUntil > DateTime.now()
  }
}
