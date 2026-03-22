import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'candidate_profiles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('recontact_cooldown_days').notNullable().defaultTo(180)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('recontact_cooldown_days')
    })
  }
}
