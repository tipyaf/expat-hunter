import { randomUUID } from 'node:crypto'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { compose } from '@adonisjs/core/helpers'
import hash from '@adonisjs/core/services/hash'
import { BaseModel, beforeCreate, column, hasOne } from '@adonisjs/lucid/orm'
import type { HasOne } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import CandidateProfile from '#models/candidate_profile'
import FollowUpSequence from '#models/follow_up_sequence'

const AuthFinder = withAuthFinder(() => hash.use('bcrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare fullName: string

  @column()
  declare locale: string

  @column()
  declare isAdmin: boolean

  @column.dateTime()
  declare emailVerifiedAt: DateTime | null

  get isEmailVerified(): boolean {
    return this.emailVerifiedAt !== null
  }

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @beforeCreate()
  static assignUuid(user: User) {
    if (!user.id) {
      user.id = randomUUID()
    }
  }

  @hasOne(() => CandidateProfile)
  declare candidateProfile: HasOne<typeof CandidateProfile>

  @hasOne(() => FollowUpSequence)
  declare followUpSequence: HasOne<typeof FollowUpSequence>

  static accessTokens = DbAccessTokensProvider.forModel(User)
}
