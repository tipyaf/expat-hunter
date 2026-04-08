import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'accreditation_caches'

  async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('slug', 255).notNullable()
      table.string('country', 10).notNullable()
      table.boolean('is_accredited').notNullable().defaultTo(false)
      table.string('source', 255).nullable()
      table.timestamp('checked_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['slug', 'country'])
    })
  }

  async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
