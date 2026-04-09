import { randomUUID } from 'node:crypto'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import JobOffer from '#models/job_offer'
import User from '#models/user'
import Contact from '#models/contact'

export default class RecruitmentContact extends BaseModel {
  static readonly table = 'recruitment_contacts'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare offerId: string

  @column()
  declare userId: string

  @column()
  declare name: string

  @column()
  declare role: string | null

  @column()
  declare email: string | null

  @column()
  declare linkedinUrl: string | null

  @column()
  declare notes: string | null

  @column()
  declare leadId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => JobOffer, { foreignKey: 'offerId' })
  declare offer: BelongsTo<typeof JobOffer>

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Contact, { foreignKey: 'leadId' })
  declare lead: BelongsTo<typeof Contact>

  @beforeCreate()
  static assignUuid(contact: RecruitmentContact): void {
    if (!contact.id) {
      contact.id = randomUUID()
    }
  }
}
