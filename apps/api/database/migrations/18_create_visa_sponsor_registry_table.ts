import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'visa_sponsor_registry'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('country', 3).notNullable()
      table.string('company_name', 255).notNullable()
      table.string('company_name_normalized', 255).notNullable()
      table.string('visa_type', 50).notNullable()
      table.date('accredited_since').nullable()
      table.jsonb('raw_data').nullable()
      table.text('source_url').nullable()
      table.timestamp('indexed_at', { useTz: true }).notNullable()
    })

    this.schema.raw(
      'CREATE INDEX visa_sponsor_registry_country_name_idx ON visa_sponsor_registry (country, company_name_normalized)'
    )
    this.schema.raw(
      'CREATE INDEX visa_sponsor_registry_country_visa_idx ON visa_sponsor_registry (country, visa_type)'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
