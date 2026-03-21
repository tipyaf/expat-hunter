import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'

export default class SourcingSource extends BaseModel {
  static table = 'sourcing_sources'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare country: string

  @column()
  declare baseUrl: string

  @column()
  declare scraperClass: string

  @column()
  declare enabled: boolean

  @column({
    serialize: (value: string | null) => (value ? JSON.parse(value) : null),
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
  })
  declare config: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(source: SourcingSource) {
    if (!source.id) {
      source.id = randomUUID()
    }
  }
}
