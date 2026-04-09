import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contacts'

  async up(): Promise<void> {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('recruitment_status', 30).nullable().defaultTo(null)
    })
  }

  async down(): Promise<void> {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('recruitment_status')
    })
  }
}
