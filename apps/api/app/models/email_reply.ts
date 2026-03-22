import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import User from './user.js'
import Contact from './contact.js'
import EmailMessage from './email_message.js'

export type DetectedEvent = 'interview' | 'rejection' | 'offer' | 'info_request' | 'other'

export default class EmailReply extends BaseModel {
  static table = 'email_replies'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare emailMessageId: string | null

  @column()
  declare userId: string

  @column()
  declare contactId: string

  @column()
  declare fromEmail: string

  @column()
  declare subject: string

  @column()
  declare bodyText: string | null

  @column()
  declare bodyHtml: string | null

  @column.dateTime()
  declare receivedAt: DateTime

  @column()
  declare isRead: boolean

  @column()
  declare detectedEvent: DetectedEvent | null

  @column()
  declare aiSummary: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Contact)
  declare contact: BelongsTo<typeof Contact>

  @belongsTo(() => EmailMessage)
  declare emailMessage: BelongsTo<typeof EmailMessage>

  @beforeCreate()
  static assignUuid(reply: EmailReply) {
    if (!reply.id) {
      reply.id = randomUUID()
    }
  }
}
