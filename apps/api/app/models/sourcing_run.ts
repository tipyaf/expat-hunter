import { BaseModel, beforeCreate, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import Contact from './contact.js'
import User from './user.js'

export type SourcingRunStatus = 'pending' | 'running' | 'completed' | 'failed'

export default class SourcingRun extends BaseModel {
  static table = 'sourcing_runs'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare status: SourcingRunStatus

  @column()
  declare country: string

  @column()
  declare sector: string | null

  @column({
    serialize: (value: string) => JSON.parse(value),
    prepare: (value: string[]) => JSON.stringify(value),
  })
  declare sources: string[]

  @column()
  declare contactsFound: number

  @column.dateTime()
  declare startedAt: DateTime | null

  @column.dateTime()
  declare completedAt: DateTime | null

  @column({
    serialize: (value: string | null) => (value ? JSON.parse(value) : null),
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
  })
  declare errors: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Contact, { foreignKey: 'sourcingRunId' })
  declare contacts: HasMany<typeof Contact>

  @beforeCreate()
  static assignUuid(run: SourcingRun) {
    if (!run.id) {
      run.id = randomUUID()
    }
  }
}
