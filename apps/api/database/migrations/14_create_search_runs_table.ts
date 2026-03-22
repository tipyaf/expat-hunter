import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'search_runs'

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
        .uuid('sourcing_run_id')
        .nullable()
        .references('id')
        .inTable('sourcing_runs')
        .onDelete('SET NULL')
      table.string('country', 100).notNullable()
      table.string('sector', 255).nullable()
      table
        .string('status', 30)
        .notNullable()
        .defaultTo('pending')
        .checkIn(['pending', 'scraping', 'analyzing', 'generating', 'completed', 'failed'])
      table.integer('contacts_found').notNullable().defaultTo(0)
      table.integer('contacts_relevant').notNullable().defaultTo(0)
      table.integer('emails_generated').notNullable().defaultTo(0)
      table.integer('contacts_excluded_cooldown').notNullable().defaultTo(0)
      table.integer('progress_percent').notNullable().defaultTo(0)
      table.string('current_step', 30).nullable()
      table.text('error_message').nullable()
      table.timestamp('started_at').nullable()
      table.timestamp('completed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['user_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
