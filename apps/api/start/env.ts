import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  /*
  |--------------------------------------------------------------------------
  | App environment
  |--------------------------------------------------------------------------
  */
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string.optional(),

  /*
  |--------------------------------------------------------------------------
  | Database
  |--------------------------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  /*
  |--------------------------------------------------------------------------
  | Mail
  |--------------------------------------------------------------------------
  */
  SMTP_HOST: Env.schema.string.optional(),
  SMTP_PORT: Env.schema.number.optional(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),
  MAIL_FROM: Env.schema.string.optional(),

  /*
  |--------------------------------------------------------------------------
  | Drive / Storage
  |--------------------------------------------------------------------------
  */
  DRIVE_DISK: Env.schema.enum(['local', 's3'] as const),

  /*
  |--------------------------------------------------------------------------
  | OpenRouter (AI)
  |--------------------------------------------------------------------------
  */
  OPENROUTER_API_KEY: Env.schema.string.optional(),
  OPENROUTER_MODEL: Env.schema.string.optional(),

  /*
  |--------------------------------------------------------------------------
  | Apify (Scraping fallback)
  |--------------------------------------------------------------------------
  */
  APIFY_TOKEN: Env.schema.string.optional(),

  /*
  |--------------------------------------------------------------------------
  | Email enrichment
  |--------------------------------------------------------------------------
  */
  HUNTER_API_KEY: Env.schema.string.optional(),
  APOLLO_API_KEY: Env.schema.string.optional(),

  /*
  |--------------------------------------------------------------------------
  | Playwright (external scraping server)
  |--------------------------------------------------------------------------
  */
  PLAYWRIGHT_SERVER_URL: Env.schema.string.optional(),
  PLAYWRIGHT_SERVER_TOKEN: Env.schema.string.optional(),

  /*
  |--------------------------------------------------------------------------
  | Google OAuth
  |--------------------------------------------------------------------------
  */
  GOOGLE_CLIENT_ID: Env.schema.string(),
  GOOGLE_CLIENT_SECRET: Env.schema.string(),
  APP_URL: Env.schema.string(),
  FRONTEND_URL: Env.schema.string(),

  /*
  |--------------------------------------------------------------------------
  | Scheduler (recurring search cron)
  |--------------------------------------------------------------------------
  */
  SCHEDULER_SECRET: Env.schema.string.optional(),
})
