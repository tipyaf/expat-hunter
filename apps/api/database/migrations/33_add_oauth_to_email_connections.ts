import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'email_connections'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('connection_type', 10).notNullable().defaultTo('manual')
      table.string('oauth_provider', 20).nullable()
      table.text('oauth_access_token').nullable()
      table.text('oauth_refresh_token').nullable()
      table.timestamp('oauth_expires_at').nullable()
      table.string('oauth_email').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('connection_type')
      table.dropColumn('oauth_provider')
      table.dropColumn('oauth_access_token')
      table.dropColumn('oauth_refresh_token')
      table.dropColumn('oauth_expires_at')
      table.dropColumn('oauth_email')
    })
  }
}
