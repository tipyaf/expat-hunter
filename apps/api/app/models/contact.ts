import { BaseModel, beforeCreate, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import Company from './company.js'
import EmailMessage from './email_message.js'
import SourcingRun from './sourcing_run.js'
import User from './user.js'

export type ContactStatus =
  | 'identified'
  | 'analyzed'
  | 'to_contact'
  | 'contacted'
  | 'replied'
  | 'interview'
  | 'offer'
  | 'rejected'

export type RelevanceLabel = 'very_relevant' | 'relevant' | 'to_review' | 'not_relevant'
export type AiRecommendation = 'contact' | 'skip' | 'manual_review'

export default class Contact extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare companyId: string

  @column()
  declare sourcingRunId: string | null

  @column()
  declare fullName: string

  @column()
  declare role: string

  @column()
  declare email: string | null

  @column()
  declare linkedinUrl: string | null

  @column()
  declare source: string

  @column()
  declare status: ContactStatus

  @column()
  declare relevanceScore: number | null

  @column()
  declare relevanceLabel: RelevanceLabel | null

  @column()
  declare relevanceReason: string | null

  @column()
  declare aiRecommendation: AiRecommendation | null

  @column()
  declare userOverride: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Company)
  declare company: BelongsTo<typeof Company>

  @belongsTo(() => SourcingRun)
  declare sourcingRun: BelongsTo<typeof SourcingRun>

  @hasMany(() => EmailMessage)
  declare emails: HasMany<typeof EmailMessage>

  @beforeCreate()
  static assignUuid(contact: Contact) {
    if (!contact.id) {
      contact.id = randomUUID()
    }
  }
}
