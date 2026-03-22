import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'

export default class VisaSponsorRegistry extends BaseModel {
  static table = 'visa_sponsor_registry'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare country: string

  @column()
  declare companyName: string

  @column()
  declare companyNameNormalized: string

  @column()
  declare visaType: string

  @column.date()
  declare accreditedSince: DateTime | null

  @column({
    serialize: (value: string | null) => (value ? JSON.parse(value) : null),
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
  })
  declare rawData: Record<string, unknown> | null

  @column()
  declare sourceUrl: string | null

  @column.dateTime()
  declare indexedAt: DateTime

  @beforeCreate()
  static assignUuid(record: VisaSponsorRegistry) {
    if (!record.id) {
      record.id = randomUUID()
    }
  }
}
