import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('companies', (table) => {
      table.timestamp('visa_sponsor_expires_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable('companies', (table) => {
      table.dropColumn('visa_sponsor_expires_at')
    })
  }
}
