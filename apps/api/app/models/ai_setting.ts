import { randomUUID } from 'node:crypto'
import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import type { DateTime } from 'luxon'

export type FeatureKey = 'default' | 'cv_extraction' | 'relevance_analysis' | 'email_generation'

export default class AiSetting extends BaseModel {
  static table = 'ai_settings'
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare featureKey: FeatureKey

  @column()
  declare model: string

  @column()
  declare temperature: number

  @column()
  declare maxTokens: number

  @column()
  declare isEnabled: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(setting: AiSetting) {
    if (!setting.id) {
      setting.id = randomUUID()
    }
  }
}
