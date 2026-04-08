import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'job_offers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('search_id')
        .notNullable()
        .references('id')
        .inTable('job_searches')
        .onDelete('CASCADE')
      table.uuid('company_cache_id').nullable()
      table.string('title', 500).notNullable()
      table.text('description_raw').nullable()
      table.string('status', 20).notNullable().defaultTo('new')
      table.integer('relevance_score').nullable()
      table.integer('salary_min').nullable()
      table.integer('salary_max').nullable()
      table.string('salary_currency', 5).nullable()
      table.string('location', 255).nullable()
      table.string('remote_type', 10).nullable()
      table.jsonb('publication_dates').notNullable().defaultTo('[]')
      table.timestamp('closing_date').nullable()
      table.string('contact_email', 255).nullable()
      table.boolean('is_republished').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['search_id'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
