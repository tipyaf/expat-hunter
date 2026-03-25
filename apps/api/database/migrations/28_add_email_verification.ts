import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.timestamp('email_verified_at').nullable()
    })

    this.schema.createTable('email_verifications', (table) => {
      table.uuid('id').primary()
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('token', 64).notNullable().unique()
      table.timestamp('expires_at').notNullable()
      table.boolean('used').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('email_verifications')
    this.schema.alterTable('users', (table) => {
      table.dropColumn('email_verified_at')
    })
  }
}
