import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import User from './user.js'

export type PresetLength = 'short' | 'medium' | 'long'
export type PresetFramework = 'aida' | 'pas' | 'bab' | 'direct'

export default class GenerationPreset extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare name: string

  @column()
  declare length: PresetLength

  @column()
  declare framework: PresetFramework

  @column()
  declare tone: string

  @column()
  declare language: string

  @column()
  declare customInstructions: string | null

  @column()
  declare isDefault: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @beforeCreate()
  static assignUuid(preset: GenerationPreset) {
    if (!preset.id) {
      preset.id = randomUUID()
    }
  }
}
