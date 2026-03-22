import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'search_runs'

  async up() {
    this.schema.raw(`
      ALTER TABLE ${this.tableName}
      DROP CONSTRAINT IF EXISTS search_runs_status_check
    `)
    this.schema.raw(`
      ALTER TABLE ${this.tableName}
      ADD CONSTRAINT search_runs_status_check
      CHECK (status IN ('pending', 'scraping', 'enriching', 'analyzing', 'generating', 'completed', 'failed'))
    `)
  }

  async down() {
    this.schema.raw(`
      ALTER TABLE ${this.tableName}
      DROP CONSTRAINT IF EXISTS search_runs_status_check
    `)
    this.schema.raw(`
      ALTER TABLE ${this.tableName}
      ADD CONSTRAINT search_runs_status_check
      CHECK (status IN ('pending', 'scraping', 'analyzing', 'generating', 'completed', 'failed'))
    `)
  }
}
