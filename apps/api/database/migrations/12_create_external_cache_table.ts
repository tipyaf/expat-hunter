import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'external_cache'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('source', 50).notNullable()
      table.string('entity_type', 50).notNullable()
      table.string('entity_key', 500).notNullable()
      table.jsonb('data').notNullable()
      table.timestamp('fetched_at').notNullable()
      table.timestamp('expires_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['source', 'entity_type', 'entity_key'])
      table.index(['entity_type', 'entity_key'])
      table.index(['expires_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
