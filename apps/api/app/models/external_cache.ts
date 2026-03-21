import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'

export default class ExternalCache extends BaseModel {
  static table = 'external_cache'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare source: string

  @column()
  declare entityType: string

  @column()
  declare entityKey: string

  @column({
    serialize: (value: string | null) => (value ? JSON.parse(value) : null),
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
  })
  declare data: Record<string, unknown>

  @column.dateTime()
  declare fetchedAt: DateTime

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(entry: ExternalCache) {
    if (!entry.id) {
      entry.id = randomUUID()
    }
  }

  get isExpired(): boolean {
    return DateTime.now() > this.expiresAt
  }
}
