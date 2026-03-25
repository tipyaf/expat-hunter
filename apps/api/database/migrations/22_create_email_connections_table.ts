import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'email_connections'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('imap_host').notNullable()
      table.integer('imap_port').notNullable()
      table.string('imap_user').notNullable()
      table.text('imap_password').notNullable()
      table.string('smtp_host').notNullable()
      table.integer('smtp_port').notNullable()
      table.string('smtp_user').notNullable()
      table.text('smtp_password').notNullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('last_synced_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
