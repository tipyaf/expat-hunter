import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'custom_platforms'

  async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('name', 255).notNullable()
      table.string('url', 2048).notNullable()
      table.string('country', 10).nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Unique constraint: same user cannot add the same URL twice
      table.unique(['user_id', 'url'])
    })
  }

  async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
