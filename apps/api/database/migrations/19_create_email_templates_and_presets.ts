import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // email_templates — reusable subject/body patterns
    this.schema.createTable('email_templates', (table) => {
      table.uuid('id').primary()
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('name', 100).notNullable()
      table.string('subject_pattern', 300).notNullable()
      table.text('body_pattern').notNullable()
      table.boolean('is_default').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    // generation_presets — AI generation style preferences
    this.schema.createTable('generation_presets', (table) => {
      table.uuid('id').primary()
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('name', 100).notNullable()
      table.enum('length', ['short', 'medium', 'long']).notNullable().defaultTo('medium')
      table.enum('framework', ['aida', 'pas', 'bab', 'direct']).notNullable().defaultTo('direct')
      table.string('tone', 50).notNullable().defaultTo('professional')
      table.string('language', 10).notNullable().defaultTo('fr')
      table.text('custom_instructions').nullable()
      table.boolean('is_default').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    // Add value JSON column to ai_settings (Option B — non-destructive)
    this.schema.alterTable('ai_settings', (table) => {
      table.json('value').nullable()
    })
  }

  async down() {
    this.schema.dropTable('generation_presets')
    this.schema.dropTable('email_templates')
    this.schema.alterTable('ai_settings', (table) => {
      table.dropColumn('value')
    })
  }
}
