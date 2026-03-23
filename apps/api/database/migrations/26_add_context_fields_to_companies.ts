import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'companies'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.jsonb('context_data').nullable()
      table.timestamp('context_enriched_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('context_data')
      table.dropColumn('context_enriched_at')
    })
  }
}
