import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contacts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('last_contacted_at').nullable()
      table.timestamp('cooldown_until').nullable()

      table.index(['user_id', 'cooldown_until'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['user_id', 'cooldown_until'])
      table.dropColumn('cooldown_until')
      table.dropColumn('last_contacted_at')
    })
  }
}
