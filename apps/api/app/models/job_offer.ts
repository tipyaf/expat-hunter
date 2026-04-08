import { BaseModel, beforeCreate, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import type { JobOfferStatus, RemoteType } from '@expat-hunter/shared'
import JobSearch from './job_search.js'
import JobOfferLink from './job_offer_link.js'

export default class JobOffer extends BaseModel {
  static readonly table = 'job_offers'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare searchId: string

  @column()
  declare companyCacheId: string | null

  @column()
  declare title: string

  @column()
  declare descriptionRaw: string | null

  @column()
  declare status: JobOfferStatus

  @column()
  declare relevanceScore: number | null

  @column()
  declare salaryMin: number | null

  @column()
  declare salaryMax: number | null

  @column()
  declare salaryCurrency: string | null

  @column()
  declare location: string | null

  @column()
  declare remoteType: RemoteType | null

  @column({
    serialize: (value: string | string[]) => (typeof value === 'string' ? JSON.parse(value) : value),
    prepare: (value: string[]) => JSON.stringify(value),
  })
  declare publicationDates: string[]

  @column.dateTime()
  declare closingDate: DateTime | null

  @column()
  declare contactEmail: string | null

  @column()
  declare isRepublished: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => JobSearch)
  declare search: BelongsTo<typeof JobSearch>

  @hasMany(() => JobOfferLink, { foreignKey: 'offerId' })
  declare links: HasMany<typeof JobOfferLink>

  @beforeCreate()
  static assignUuid(offer: JobOffer): void {
    if (!offer.id) {
      offer.id = randomUUID()
    }
  }
}
