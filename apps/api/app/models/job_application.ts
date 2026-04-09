import { randomUUID } from 'node:crypto'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import JobOffer from '#models/job_offer'
import User from '#models/user'

export type JobApplicationStatus = 'draft' | 'ready' | 'sent'

export interface CvReplacement {
  oldText: string
  newText: string
}

const jsonbColumn = {
  prepare: (value: unknown): string => JSON.stringify(value),
  consume: (value: unknown): unknown => (typeof value === 'string' ? JSON.parse(value) : value),
}

export default class JobApplication extends BaseModel {
  static readonly table = 'job_applications'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare offerId: string

  @column()
  declare userId: string

  @column()
  declare cvText: string | null

  @column(jsonbColumn)
  declare cvReplacements: CvReplacement[] | null

  @column()
  declare cvUserInstruction: string | null

  @column()
  declare coverLetterText: string | null

  @column()
  declare coverLetterUserInstruction: string | null

  @column()
  declare applicationEmailText: string | null

  @column()
  declare status: JobApplicationStatus

  @column.dateTime()
  declare sentAt: DateTime | null

  @column()
  declare sentToEmail: string | null

  @column()
  declare language: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => JobOffer, { foreignKey: 'offerId' })
  declare offer: BelongsTo<typeof JobOffer>

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @beforeCreate()
  static assignUuid(application: JobApplication): void {
    if (!application.id) {
      application.id = randomUUID()
    }
  }
}
