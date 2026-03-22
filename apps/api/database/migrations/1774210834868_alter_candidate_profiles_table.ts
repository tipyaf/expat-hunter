import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'candidate_profiles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.jsonb('follow_ups').nullable()
      table.jsonb('sending_schedule').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('follow_ups')
      table.dropColumn('sending_schedule')
    })
  }
}
