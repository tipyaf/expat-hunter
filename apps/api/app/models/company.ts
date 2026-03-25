import { BaseModel, beforeCreate, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import Contact from './contact.js'

export default class Company extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare website: string | null

  @column()
  declare sector: string | null

  @column()
  declare size: string | null

  @column()
  declare city: string | null

  @column()
  declare country: string

  @column()
  declare linkedinUrl: string | null

  @column({
    serialize: (value: string | null) => (value ? JSON.parse(value) : null),
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
  })
  declare signals: Record<string, unknown> | null

  @column()
  declare source: string

  @column()
  declare domain: string | null

  @column()
  declare visaSponsorStatus: 'accredited' | 'not_found' | 'unknown' | null

  @column({
    serialize: (value: string | null) => (value ? JSON.parse(value) : null),
    prepare: (value: string[] | null) => (value ? JSON.stringify(value) : null),
  })
  declare visaSponsorCountries: string[] | null

  @column.dateTime()
  declare visaRegistryCheckedAt: DateTime | null

  @column.dateTime()
  declare visaSponsorExpiresAt: DateTime | null

  @column.dateTime()
  declare teamCrawledAt: DateTime | null

  @column()
  declare hiringIntensity: number | null

  @column({
    serialize: (value: string | null) => (value ? JSON.parse(value) : null),
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
  })
  declare contextData: Record<string, unknown> | null

  @column.dateTime()
  declare contextEnrichedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => Contact)
  declare contacts: HasMany<typeof Contact>

  @beforeCreate()
  static assignUuid(company: Company) {
    if (!company.id) {
      company.id = randomUUID()
    }
  }
}
