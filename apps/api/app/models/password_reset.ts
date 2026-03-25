import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import User from './user.js'

export default class PasswordReset extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare token: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column()
  declare used: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  get isExpired(): boolean {
    return this.expiresAt < DateTime.now()
  }

  get isValid(): boolean {
    return !this.used && !this.isExpired
  }

  @beforeCreate()
  static assignUuid(reset: PasswordReset) {
    if (!reset.id) {
      reset.id = randomUUID()
    }
  }
}
