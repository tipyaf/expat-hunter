import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'blocked_entities'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('entity_type').notNullable() // 'contact' | 'company'
      table.uuid('entity_id').notNullable()
      table.timestamp('blocked_until', { useTz: true }).nullable()
      table.text('reason').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['user_id', 'entity_type', 'entity_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
