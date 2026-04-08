import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'

export default class AccreditationCache extends BaseModel {
  static readonly table = 'accreditation_caches'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare slug: string

  @column()
  declare country: string

  @column()
  declare isAccredited: boolean

  @column()
  declare source: string | null

  @column.dateTime()
  declare checkedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(cache: AccreditationCache): void {
    if (!cache.id) {
      cache.id = randomUUID()
    }
  }
}
