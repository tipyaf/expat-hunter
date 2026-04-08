import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import type { ExclusionCategory } from '@expat-hunter/shared'
import User from './user.js'
import JobOffer from './job_offer.js'

export default class JobOfferExclusion extends BaseModel {
  static readonly table = 'job_offer_exclusions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare offerId: string

  @column()
  declare category: ExclusionCategory

  @column()
  declare reason: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => JobOffer, { foreignKey: 'offerId' })
  declare offer: BelongsTo<typeof JobOffer>

  @beforeCreate()
  static assignUuid(exclusion: JobOfferExclusion): void {
    if (!exclusion.id) {
      exclusion.id = randomUUID()
    }
  }
}
