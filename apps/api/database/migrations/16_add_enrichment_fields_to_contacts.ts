import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'contacts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('source_detail', 1000).nullable()
      table
        .enum('email_source', ['scraped', 'hunter', 'apollo', 'inferred', 'page'])
        .nullable()
      table.smallint('email_confidence').nullable()
      table
        .enum('email_status', ['verified', 'probable', 'unknown', 'bounced'])
        .nullable()
      table.jsonb('email_alternatives').nullable()
      table.jsonb('score_breakdown').nullable()
      table.string('score_version', 20).nullable()
      table.string('github_url', 500).nullable()
    })

    this.schema.raw(
      'CREATE INDEX contacts_email_status_idx ON contacts (email_status)'
    )
    this.schema.raw(
      'CREATE INDEX contacts_user_email_status_idx ON contacts (user_id, email_status)'
    )
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS contacts_email_status_idx')
    this.schema.raw('DROP INDEX IF EXISTS contacts_user_email_status_idx')

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('source_detail')
      table.dropColumn('email_source')
      table.dropColumn('email_confidence')
      table.dropColumn('email_status')
      table.dropColumn('email_alternatives')
      table.dropColumn('score_breakdown')
      table.dropColumn('score_version')
      table.dropColumn('github_url')
    })
  }
}
