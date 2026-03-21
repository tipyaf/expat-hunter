import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import Contact from './contact.js'

export type EmailType = 'initial' | 'follow_up_1' | 'follow_up_2' | 'follow_up_3'
export type EmailStatus = 'draft' | 'approved' | 'sent' | 'opened' | 'replied' | 'bounced'

export default class EmailMessage extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare contactId: string

  @column()
  declare subject: string

  @column()
  declare body: string

  @column()
  declare type: EmailType

  @column()
  declare status: EmailStatus

  @column.dateTime()
  declare sentAt: DateTime | null

  @column.dateTime()
  declare scheduledAt: DateTime | null

  @column.dateTime()
  declare openedAt: DateTime | null

  @column.dateTime()
  declare repliedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Contact)
  declare contact: BelongsTo<typeof Contact>

  @beforeCreate()
  static assignUuid(message: EmailMessage) {
    if (!message.id) {
      message.id = randomUUID()
    }
  }
}
