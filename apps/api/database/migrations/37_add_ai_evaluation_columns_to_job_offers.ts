import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddAiEvaluationColumnsToJobOffers extends BaseSchema {
  protected tableName = 'job_offers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('match_summary').nullable()
      table.text('selection_reason').nullable()
      table.text('application_advice').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('match_summary')
      table.dropColumn('selection_reason')
      table.dropColumn('application_advice')
    })
  }
}
