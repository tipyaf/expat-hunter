import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'companies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('name', 255).notNullable()
      table.string('website', 500).nullable()
      table.string('sector', 100).nullable()
      table.string('size', 20).nullable()
      table.string('city', 100).nullable()
      table.string('country', 3).notNullable()
      table.string('linkedin_url', 500).nullable()
      table.jsonb('signals').nullable()
      table.string('source', 50).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['name', 'country'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
