import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import type { CompanyType } from '@expat-hunter/shared'

export default class CompanyCache extends BaseModel {
  static readonly table = 'company_caches'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare slug: string

  @column()
  declare country: string

  @column()
  declare name: string

  @column()
  declare sector: string | null

  @column()
  declare size: string | null

  @column()
  declare companyType: CompanyType

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(cache: CompanyCache): void {
    if (!cache.id) {
      cache.id = randomUUID()
    }
  }
}
