import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'company_caches'

  async up(): Promise<void> {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('slug', 255).notNullable()
      table.string('country', 10).notNullable()
      table.string('name', 255).notNullable()
      table.string('sector', 255).nullable()
      table.string('size', 100).nullable()
      table.string('company_type', 50).notNullable().defaultTo('unknown')
      table.timestamp('expires_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['slug', 'country'])
      table.index(['expires_at'])
    })

    // Add company_name column to job_offers for enrichment lookup
    this.schema.alterTable('job_offers', (table) => {
      table.string('company_name', 255).nullable().after('company_cache_id')
    })
  }

  async down(): Promise<void> {
    this.schema.alterTable('job_offers', (table) => {
      table.dropColumn('company_name')
    })
    this.schema.dropTable(this.tableName)
  }
}
