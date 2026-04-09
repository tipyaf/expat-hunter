import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'recruitment_contacts'

  async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('offer_id').notNullable().references('id').inTable('job_offers').onDelete('CASCADE')
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('name', 255).notNullable()
      table.string('role', 255).nullable()
      table.string('email', 255).nullable()
      table.string('linkedin_url', 500).nullable()
      table.text('notes').nullable()
      table.uuid('lead_id').nullable().references('id').inTable('contacts').onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['offer_id', 'user_id'])
      table.unique(['offer_id', 'email'])
    })
  }

  async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
