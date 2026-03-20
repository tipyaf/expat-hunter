import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'candidate_profiles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('user_id')
        .notNullable()
        .unique()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.text('cv_text').nullable()
      table.string('cv_file_path', 500).nullable()
      table.jsonb('skills').notNullable().defaultTo('[]')
      table.integer('experience_years').notNullable().defaultTo(0)
      table.jsonb('target_countries').notNullable().defaultTo('[]')
      table.jsonb('target_sectors').notNullable().defaultTo('[]')
      table.jsonb('target_roles').notNullable().defaultTo('[]')
      table.jsonb('preferences').nullable()
      table.boolean('onboarding_completed').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
