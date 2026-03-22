import { randomUUID } from 'node:crypto'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import User from '#models/user'

const jsonbColumn = {
  prepare: (value: unknown) => JSON.stringify(value),
  consume: (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : value),
}

export default class CandidateProfile extends BaseModel {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare cvText: string | null

  @column()
  declare cvFilePath: string | null

  @column(jsonbColumn)
  declare skills: string[]

  @column()
  declare experienceYears: number

  @column(jsonbColumn)
  declare targetCountries: string[]

  @column(jsonbColumn)
  declare targetSectors: string[]

  @column(jsonbColumn)
  declare targetRoles: string[]

  @column(jsonbColumn)
  declare preferences: Record<string, unknown> | null

  @column()
  declare onboardingCompleted: boolean

  @column()
  declare recontactCooldownDays: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @beforeCreate()
  static assignUuid(profile: CandidateProfile) {
    if (!profile.id) {
      profile.id = randomUUID()
    }
  }
}
