import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'companies'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('domain', 255).nullable()
      table
        .enum('visa_sponsor_status', ['accredited', 'not_found', 'unknown'])
        .nullable()
        .defaultTo('unknown')
      table.jsonb('visa_sponsor_countries').nullable()
      table.timestamp('visa_registry_checked_at', { useTz: true }).nullable()
      table.timestamp('team_crawled_at', { useTz: true }).nullable()
      table.smallint('hiring_intensity').nullable()
    })

    this.schema.raw(
      `CREATE UNIQUE INDEX companies_domain_unique ON companies (domain) WHERE domain IS NOT NULL`
    )
    this.schema.raw(
      'CREATE INDEX companies_visa_sponsor_status_idx ON companies (visa_sponsor_status)'
    )
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS companies_domain_unique')
    this.schema.raw('DROP INDEX IF EXISTS companies_visa_sponsor_status_idx')

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('domain')
      table.dropColumn('visa_sponsor_status')
      table.dropColumn('visa_sponsor_countries')
      table.dropColumn('visa_registry_checked_at')
      table.dropColumn('team_crawled_at')
      table.dropColumn('hiring_intensity')
    })
  }
}
