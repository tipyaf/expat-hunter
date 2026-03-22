import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'email_replies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('email_message_id')
        .nullable()
        .references('id')
        .inTable('email_messages')
        .onDelete('CASCADE')
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.uuid('contact_id').notNullable().references('id').inTable('contacts').onDelete('CASCADE')
      table.string('from_email').notNullable()
      table.string('subject').notNullable()
      table.text('body_text').nullable()
      table.text('body_html').nullable()
      table.timestamp('received_at', { useTz: true }).notNullable()
      table.boolean('is_read').notNullable().defaultTo(false)
      table.string('detected_event').nullable()
      table.text('ai_summary').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['user_id', 'is_read'])
      table.index(['contact_id', 'received_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
