import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contacts'

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
        .uuid('company_id')
        .notNullable()
        .references('id')
        .inTable('companies')
        .onDelete('CASCADE')
      table
        .uuid('sourcing_run_id')
        .nullable()
        .references('id')
        .inTable('sourcing_runs')
        .onDelete('SET NULL')
      table.string('full_name', 255).notNullable()
      table.string('role', 255).notNullable()
      table.string('email', 255).nullable()
      table.string('linkedin_url', 500).nullable()
      table.string('source', 50).notNullable()
      table
        .string('status', 20)
        .notNullable()
        .defaultTo('identified')
        .checkIn([
          'identified',
          'analyzed',
          'to_contact',
          'contacted',
          'replied',
          'interview',
          'offer',
          'rejected',
        ])
      table.integer('relevance_score').nullable()
      table.string('relevance_label', 20).nullable()
      table.text('relevance_reason').nullable()
      table.string('ai_recommendation', 20).nullable()
      table.boolean('user_override').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['user_id', 'status'])
    })

    // Partial unique indexes for deduplication
    this.schema.raw(
      'CREATE UNIQUE INDEX contacts_user_linkedin_unique ON contacts (user_id, linkedin_url) WHERE linkedin_url IS NOT NULL'
    )
    this.schema.raw(
      'CREATE UNIQUE INDEX contacts_user_email_unique ON contacts (user_id, email) WHERE email IS NOT NULL'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
