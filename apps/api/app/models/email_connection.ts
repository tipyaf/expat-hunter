import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import User from './user.js'

export default class EmailConnection extends BaseModel {
  static table = 'email_connections'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare imapHost: string

  @column()
  declare imapPort: number

  @column()
  declare imapUser: string

  @column()
  declare imapPassword: string

  @column()
  declare smtpHost: string

  @column()
  declare smtpPort: number

  @column()
  declare smtpUser: string

  @column()
  declare smtpPassword: string

  @column()
  declare isActive: boolean

  @column.dateTime()
  declare lastSyncedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @beforeCreate()
  static assignUuid(connection: EmailConnection) {
    if (!connection.id) {
      connection.id = randomUUID()
    }
  }
}
