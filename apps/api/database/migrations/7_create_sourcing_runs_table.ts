import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sourcing_runs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .string('status', 20)
        .notNullable()
        .defaultTo('pending')
        .checkIn(['pending', 'running', 'completed', 'failed'])
      table.string('country', 3).notNullable()
      table.string('sector', 100).nullable()
      table.jsonb('sources').notNullable()
      table.integer('contacts_found').notNullable().defaultTo(0)
      table.timestamp('started_at').nullable()
      table.timestamp('completed_at').nullable()
      table.jsonb('errors').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['user_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
