import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sourcing_sources'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('name', 50).notNullable()
      table.string('country', 3).notNullable()
      table.string('base_url', 500).notNullable()
      table.string('scraper_class', 100).notNullable()
      table.boolean('enabled').notNullable().defaultTo(true)
      table.jsonb('config').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['name', 'country'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
