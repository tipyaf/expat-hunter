import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateJobOfferExclusionsTable extends BaseSchema {
  protected tableName = 'job_offer_exclusions'

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
        .uuid('offer_id')
        .notNullable()
        .references('id')
        .inTable('job_offers')
        .onDelete('CASCADE')
      table.string('category', 20).notNullable()
      table.text('reason').notNullable().defaultTo('')
      table.timestamp('created_at').notNullable()

      table.index(['user_id'])
      table.index(['offer_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
