import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import User from './user.js'
import SourcingRun from './sourcing_run.js'

export type SearchRunStatus =
  | 'pending'
  | 'scraping'
  | 'analyzing'
  | 'generating'
  | 'completed'
  | 'failed'

export default class SearchRun extends BaseModel {
  static table = 'search_runs'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare sourcingRunId: string | null

  @column()
  declare country: string

  @column()
  declare sector: string | null

  @column()
  declare status: SearchRunStatus

  @column()
  declare contactsFound: number

  @column()
  declare contactsRelevant: number

  @column()
  declare emailsGenerated: number

  @column()
  declare contactsExcludedCooldown: number

  @column()
  declare progressPercent: number

  @column()
  declare currentStep: string | null

  @column()
  declare errorMessage: string | null

  @column.dateTime()
  declare startedAt: DateTime | null

  @column.dateTime()
  declare completedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => SourcingRun)
  declare sourcingRun: BelongsTo<typeof SourcingRun>

  @beforeCreate()
  static assignUuid(run: SearchRun) {
    if (!run.id) {
      run.id = randomUUID()
    }
  }
}
