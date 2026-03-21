import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ai_settings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('feature_key', 50).notNullable().unique()
      table.string('model', 100).notNullable()
      table.float('temperature').notNullable().defaultTo(0.3)
      table.integer('max_tokens').notNullable().defaultTo(1024)
      table.boolean('is_enabled').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
