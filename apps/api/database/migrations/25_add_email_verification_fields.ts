import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contacts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('email_verified_at').nullable()
      table.string('email_verify_method', 20).nullable() // 'smtp' | 'dns' | 'hunter' | 'pattern'
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('email_verified_at')
      table.dropColumn('email_verify_method')
    })
  }
}
