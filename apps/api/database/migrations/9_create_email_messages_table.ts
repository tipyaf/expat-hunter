import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'email_messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('contact_id')
        .notNullable()
        .references('id')
        .inTable('contacts')
        .onDelete('CASCADE')
      table.string('subject', 500).notNullable()
      table.text('body').notNullable()
      table.string('type', 20).notNullable().defaultTo('initial')
      table.string('status', 20).notNullable().defaultTo('draft')
      table.timestamp('sent_at').nullable()
      table.timestamp('scheduled_at').nullable()
      table.timestamp('opened_at').nullable()
      table.timestamp('replied_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['contact_id'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
