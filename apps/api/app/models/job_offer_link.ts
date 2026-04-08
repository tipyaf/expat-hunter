import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import type { JobSearchPlatform } from '@expat-hunter/shared'
import JobOffer from './job_offer.js'

export default class JobOfferLink extends BaseModel {
  static readonly table = 'job_offer_links'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare offerId: string

  @column()
  declare platform: JobSearchPlatform

  @column()
  declare url: string

  @column()
  declare applyUrl: string | null

  @column()
  declare externalId: string | null

  @column.dateTime()
  declare scrapedAt: DateTime

  @belongsTo(() => JobOffer)
  declare offer: BelongsTo<typeof JobOffer>

  @beforeCreate()
  static assignUuid(link: JobOfferLink): void {
    if (!link.id) {
      link.id = randomUUID()
    }
  }
}
