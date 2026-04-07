import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import type { JobSearchSeniority, JobSearchPlatform, JobSearchFrequency, JobSearchContractType } from '@expat-hunter/shared'
import User from './user.js'

export default class JobSearch extends BaseModel {
  static readonly table = 'job_searches'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column({
    serialize: (value: string | string[]) => (typeof value === 'string' ? JSON.parse(value) : value),
    prepare: (value: string[]) => JSON.stringify(value),
  })
  declare roles: string[]

  @column({
    serialize: (value: string | string[]) => (typeof value === 'string' ? JSON.parse(value) : value),
    prepare: (value: string[]) => JSON.stringify(value),
  })
  declare countries: string[]

  @column({
    serialize: (value: string | string[] | null) => {
      if (value == null) return null
      return typeof value === 'string' ? JSON.parse(value) : value
    },
    prepare: (value: string[] | null) => (value ? JSON.stringify(value) : null),
  })
  declare cities: string[] | null

  @column({
    serialize: (value: string | string[]) => (typeof value === 'string' ? JSON.parse(value) : value),
    prepare: (value: string[]) => JSON.stringify(value),
  })
  declare platforms: JobSearchPlatform[]

  @column()
  declare seniority: JobSearchSeniority

  @column()
  declare sector: string | null

  @column({
    serialize: (value: string | string[] | null) => {
      if (value == null) return null
      return typeof value === 'string' ? JSON.parse(value) : value
    },
    prepare: (value: string[] | null) => (value ? JSON.stringify(value) : null),
  })
  declare skills: string[] | null

  @column()
  declare salaryMin: number | null

  @column()
  declare salaryMax: number | null

  @column()
  declare contractType: JobSearchContractType | null

  @column()
  declare frequency: JobSearchFrequency

  @column()
  declare isActive: boolean

  @column.dateTime()
  declare lastRunAt: DateTime | null

  @column.dateTime()
  declare nextRunAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @beforeCreate()
  static assignUuid(jobSearch: JobSearch) {
    if (!jobSearch.id) {
      jobSearch.id = randomUUID()
    }
  }
}
