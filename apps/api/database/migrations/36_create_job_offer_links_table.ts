import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'job_offer_links'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('offer_id')
        .notNullable()
        .references('id')
        .inTable('job_offers')
        .onDelete('CASCADE')
      table.string('platform', 30).notNullable()
      table.string('url', 1000).notNullable()
      table.string('apply_url', 1000).nullable()
      table.string('external_id', 255).nullable()
      table.timestamp('scraped_at').notNullable()

      table.index(['offer_id'])
    })

    // Partial unique index: one external_id per platform (when external_id is not null)
    this.schema.raw(
      `CREATE UNIQUE INDEX job_offer_links_platform_external_id_unique
       ON job_offer_links (platform, external_id)
       WHERE external_id IS NOT NULL`
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
