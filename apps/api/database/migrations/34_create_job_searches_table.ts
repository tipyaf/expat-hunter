import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'job_searches'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.jsonb('roles').notNullable()
      table.jsonb('countries').notNullable()
      table.jsonb('cities').nullable()
      table.jsonb('platforms').notNullable()
      table.string('seniority', 20).notNullable().defaultTo('indifferent')
      table.string('sector', 100).nullable()
      table.jsonb('skills').nullable()
      table.integer('salary_min').nullable()
      table.integer('salary_max').nullable()
      table.string('contract_type', 20).nullable()
      table.string('frequency', 20).notNullable().defaultTo('manual')
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('last_run_at').nullable()
      table.timestamp('next_run_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
