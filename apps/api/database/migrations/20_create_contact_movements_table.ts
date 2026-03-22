import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contact_movements'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('contact_id').notNullable().references('id').inTable('contacts').onDelete('CASCADE')
      table.string('from_status').notNullable()
      table.string('to_status').notNullable()
      table.string('trigger').notNullable().defaultTo('manual') // 'manual' | 'email_sent' | 'email_replied' | 'drag_drop'
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.index(['contact_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
