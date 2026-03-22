import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import Contact from './contact.js'

export type MovementTrigger = 'manual' | 'email_sent' | 'email_replied' | 'drag_drop'

export default class ContactMovement extends BaseModel {
  static table = 'contact_movements'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare contactId: string

  @column()
  declare fromStatus: string

  @column()
  declare toStatus: string

  @column()
  declare trigger: MovementTrigger

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Contact)
  declare contact: BelongsTo<typeof Contact>

  @beforeCreate()
  static assignUuid(movement: ContactMovement) {
    movement.id = randomUUID()
  }
}
