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
export type EmailSource = 'scraped' | 'hunter' | 'apollo' | 'inferred' | 'page'
export type EmailStatus = 'verified' | 'probable' | 'unknown' | 'bounced'

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

  @column()
  declare sourceDetail: string | null

  @column()
  declare emailSource: EmailSource | null

  @column()
  declare emailConfidence: number | null

  @column()
  declare emailStatus: EmailStatus | null

  @column({
    serialize: (value: string | null) => (value ? JSON.parse(value) : null),
    prepare: (value: string[] | null) => (value ? JSON.stringify(value) : null),
  })
  declare emailAlternatives: string[] | null

  @column({
    serialize: (value: string | null) => (value ? JSON.parse(value) : null),
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
  })
  declare scoreBreakdown: Record<string, unknown> | null

  @column()
  declare scoreVersion: string | null

  @column()
  declare githubUrl: string | null

  @column.dateTime()
  declare emailVerifiedAt: DateTime | null

  @column()
  declare emailVerifyMethod: string | null

  @column.dateTime()
  declare lastContactedAt: DateTime | null

  @column.dateTime()
  declare cooldownUntil: DateTime | null

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

  get isInCooldown(): boolean {
    if (!this.cooldownUntil) return false
    return this.cooldownUntil > DateTime.now()
  }

  @beforeCreate()
  static assignUuid(contact: Contact) {
    if (!contact.id) {
      contact.id = randomUUID()
    }
  }
}
