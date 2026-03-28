/**
 * Direct database helper for e2e test data seeding and cleanup.
 *
 * Uses the `pg` client to insert/delete rows in the dev database,
 * following the same pattern as reset-password-flow.spec.ts.
 */
import { Client } from 'pg'
import { randomUUID } from 'node:crypto'

const DB_CONFIG = {
  host: '127.0.0.1',
  port: 5432,
  user: 'expathunter',
  password: 'expathunter',
  database: 'expat_hunter_dev',
}

/** Prefix used to identify e2e-seeded rows for safe cleanup */
const E2E_PREFIX = 'e2e-seed'

export interface SeededCompany {
  id: string
  name: string
}

export interface SeededContact {
  id: string
  fullName: string
  companyId: string
}

export interface SeededPreset {
  id: string
  name: string
}

/**
 * Get the user ID for the global e2e test user.
 * This user is created by global-setup.ts during the Playwright setup project.
 */
export async function getE2eUserId(): Promise<string> {
  const db = new Client(DB_CONFIG)
  await db.connect()
  try {
    const res = await db.query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      ['e2e-test@expathunter.test'],
    )
    if (res.rows.length === 0) {
      throw new Error('E2E test user not found. Ensure global-setup has run.')
    }
    return res.rows[0].id
  } finally {
    await db.end()
  }
}

/**
 * Seed a company for e2e tests.
 * Uses ON CONFLICT to be idempotent across test retries.
 */
export async function seedCompany(name?: string): Promise<SeededCompany> {
  const id = randomUUID()
  const companyName = name ?? `${E2E_PREFIX}-company-${Date.now()}`
  const now = new Date().toISOString()

  const db = new Client(DB_CONFIG)
  await db.connect()
  try {
    await db.query(
      `INSERT INTO companies (id, name, country, source, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (name, country) DO NOTHING`,
      [id, companyName, 'NZ', 'e2e-test', now, now],
    )
    // Fetch back the actual ID (in case ON CONFLICT hit)
    const res = await db.query<{ id: string }>(
      `SELECT id FROM companies WHERE name = $1 AND country = 'NZ' LIMIT 1`,
      [companyName],
    )
    return { id: res.rows[0].id, name: companyName }
  } finally {
    await db.end()
  }
}

/**
 * Seed a contact with ai_recommendation = 'contact' and no email (triggers Generate button).
 */
export async function seedContact(
  userId: string,
  companyId: string,
  overrides?: { fullName?: string; aiRecommendation?: string; status?: string },
): Promise<SeededContact> {
  const id = randomUUID()
  const fullName = overrides?.fullName ?? `${E2E_PREFIX}-contact-${Date.now()}`
  const aiRecommendation = overrides?.aiRecommendation ?? 'contact'
  const status = overrides?.status ?? 'to_contact'
  const now = new Date().toISOString()

  const db = new Client(DB_CONFIG)
  await db.connect()
  try {
    await db.query(
      `INSERT INTO contacts (id, user_id, company_id, full_name, role, source, status, ai_recommendation, relevance_score, relevance_label, user_override, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [id, userId, companyId, fullName, 'CTO', 'e2e-test', status, aiRecommendation, 85, 'very_relevant', false, now, now],
    )
    return { id, fullName, companyId }
  } finally {
    await db.end()
  }
}

/**
 * Seed a generation preset for the e2e test user.
 */
export async function seedPreset(
  userId: string,
  overrides?: { name?: string; isDefault?: boolean },
): Promise<SeededPreset> {
  const id = randomUUID()
  const name = overrides?.name ?? `${E2E_PREFIX}-preset-${Date.now()}`
  const isDefault = overrides?.isDefault ?? false
  const now = new Date().toISOString()

  const db = new Client(DB_CONFIG)
  await db.connect()
  try {
    await db.query(
      `INSERT INTO generation_presets (id, user_id, name, length, framework, tone, language, is_default, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, userId, name, 'medium', 'aida', 'professional', 'fr', isDefault, now, now],
    )
    return { id, name }
  } finally {
    await db.end()
  }
}

/**
 * Upgrade the e2e test user to premium plan.
 * Required for features behind the premium paywall (e.g. /suivi pipeline).
 */
export async function upgradeUserToPremium(userId: string): Promise<void> {
  const db = new Client(DB_CONFIG)
  await db.connect()
  try {
    await db.query(`UPDATE users SET plan = 'premium' WHERE id = $1`, [userId])
  } finally {
    await db.end()
  }
}

/**
 * Clean up all e2e-seeded data by prefix.
 * Call in afterAll to leave the DB clean.
 */
export async function cleanupE2eData(userId: string): Promise<void> {
  const db = new Client(DB_CONFIG)
  await db.connect()
  try {
    // Delete in FK order: contacts → companies, presets
    await db.query(
      `DELETE FROM contacts WHERE user_id = $1 AND source = 'e2e-test'`,
      [userId],
    )
    await db.query(
      `DELETE FROM companies WHERE source = 'e2e-test'`,
    )
    await db.query(
      `DELETE FROM generation_presets WHERE user_id = $1 AND name LIKE $2`,
      [userId, `${E2E_PREFIX}%`],
    )
  } finally {
    await db.end()
  }
}
