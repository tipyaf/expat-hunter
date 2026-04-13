import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddLastOffersSeenAtToUsers extends BaseSchema {
  protected tableName = 'users'

  async up(): Promise<void> {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('last_offers_seen_at').nullable().defaultTo(null)
    })
  }

  async down(): Promise<void> {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('last_offers_seen_at')
    })
  }
}
