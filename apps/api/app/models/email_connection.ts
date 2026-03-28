import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import encryption from '@adonisjs/core/services/encryption'
import User from './user.js'

export const CONNECTION_TYPE = {
  MANUAL: 'manual',
  OAUTH: 'oauth',
} as const

export const OAUTH_PROVIDER = {
  GOOGLE: 'google',
} as const

export type ConnectionType = (typeof CONNECTION_TYPE)[keyof typeof CONNECTION_TYPE]
export type OAuthProvider = (typeof OAUTH_PROVIDER)[keyof typeof OAUTH_PROVIDER]

const encryptedColumn = {
  prepare: (value: string) => encryption.encrypt(value),
  consume: (value: string) => encryption.decrypt<string>(value) ?? value,
}

const nullableEncryptedColumn = {
  prepare: (value: string | null) => (value ? encryption.encrypt(value) : null),
  consume: (value: string | null) => (value ? encryption.decrypt<string>(value) ?? value : null),
}

export default class EmailConnection extends BaseModel {
  static table = 'email_connections'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare connectionType: ConnectionType

  @column()
  declare oauthProvider: OAuthProvider | null

  @column(nullableEncryptedColumn)
  declare oauthAccessToken: string | null

  @column(nullableEncryptedColumn)
  declare oauthRefreshToken: string | null

  @column.dateTime()
  declare oauthExpiresAt: DateTime | null

  @column()
  declare oauthEmail: string | null

  @column()
  declare imapHost: string

  @column()
  declare imapPort: number

  @column()
  declare imapUser: string

  @column(encryptedColumn)
  declare imapPassword: string

  @column()
  declare smtpHost: string

  @column()
  declare smtpPort: number

  @column()
  declare smtpUser: string

  @column(encryptedColumn)
  declare smtpPassword: string

  @column()
  declare isActive: boolean

  @column.dateTime()
  declare lastSyncedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @beforeCreate()
  static assignUuid(connection: EmailConnection) {
    if (!connection.id) {
      connection.id = randomUUID()
    }
  }

  get isOAuth(): boolean {
    return this.connectionType === CONNECTION_TYPE.OAUTH
  }

  get isTokenExpired(): boolean {
    if (!this.oauthExpiresAt) return true
    return this.oauthExpiresAt < DateTime.now()
  }
}
