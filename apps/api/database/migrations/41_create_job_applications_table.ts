import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'job_applications'

  async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('offer_id').notNullable().references('id').inTable('job_offers').onDelete('CASCADE')
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.text('cv_text').nullable()
      table.jsonb('cv_replacements').nullable()
      table.text('cv_user_instruction').nullable()
      table.text('cover_letter_text').nullable()
      table.text('cover_letter_user_instruction').nullable()
      table.text('application_email_text').nullable()
      table.string('status', 20).notNullable().defaultTo('draft')
      table.timestamp('sent_at').nullable()
      table.string('sent_to_email', 255).nullable()
      table.string('language', 5).notNullable().defaultTo('en')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['offer_id', 'user_id'])
      table.check("status IN ('draft', 'ready', 'sent')", undefined, 'job_applications_status_check')
    })
  }

  async down(): Promise<void> {
    this.schema.dropTable(this.tableName)
  }
}
