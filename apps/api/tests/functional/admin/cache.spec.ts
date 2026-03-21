import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

const AUTH_URL = '/api/auth'

const adminUser = {
  email: 'cache-admin@example.com',
  password: 'password123',
  fullName: 'Cache Admin',
}

async function createUser(client: ApiClient, data: typeof adminUser) {
  const response = await client.post(`${AUTH_URL}/register`).json(data)
  return {
    token: response.body().token as string,
    userId: response.body().user.id as string,
  }
}

async function makeAdmin(userId: string) {
  await db.from('users').where('id', userId).update({ is_admin: true })
}

async function cleanupAll() {
  await db.from('external_cache').delete()
  await db.from('ai_settings').delete()
  await db.from('email_messages').delete()
  await db.from('contacts').delete()
  await db.from('companies').delete()
  await db.from('candidate_profiles').delete()
  await db.from('auth_access_tokens').delete()
  await db.from('users').delete()
}

async function insertCacheEntry(overrides: Record<string, unknown> = {}) {
  const now = DateTime.now()
  await db.table('external_cache').insert({
    id: overrides.id ?? crypto.randomUUID(),
    source: overrides.source ?? 'seek',
    entity_type: overrides.entity_type ?? 'company',
    entity_key: overrides.entity_key ?? `key-${Date.now()}`,
    data: JSON.stringify(overrides.data ?? { name: 'Test' }),
    fetched_at: (overrides.fetched_at as string) ?? now.toSQL(),
    expires_at: (overrides.expires_at as string) ?? now.plus({ days: 30 }).toSQL(),
    created_at: now.toSQL(),
    updated_at: now.toSQL(),
  })
}

// ---------------------------------------------------------------------------
// Cache Stats
// ---------------------------------------------------------------------------
test.group('Admin Cache Stats', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('admin can get empty cache stats', async ({ client, assert }) => {
    const { token, userId } = await createUser(client, adminUser)
    await makeAdmin(userId)

    const response = await client
      .get('/api/admin/ai-settings/cache/stats')
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)
    assert.equal(response.body().data.totalEntries, 0)
    assert.equal(response.body().data.expiredEntries, 0)
  })

  test('cache stats reflect inserted entries', async ({ client, assert }) => {
    const { token, userId } = await createUser(client, adminUser)
    await makeAdmin(userId)

    await insertCacheEntry({ source: 'seek', entity_type: 'company', entity_key: 'co1' })
    await insertCacheEntry({ source: 'apify', entity_type: 'contact', entity_key: 'ct1' })

    const response = await client
      .get('/api/admin/ai-settings/cache/stats')
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)

    const stats = response.body().data
    assert.equal(stats.totalEntries, 2)
    assert.property(stats.byType, 'company')
    assert.property(stats.byType, 'contact')
    assert.property(stats.bySource, 'seek')
    assert.property(stats.bySource, 'apify')
  })

  test('non-admin cannot access cache stats', async ({ client }) => {
    const { token } = await createUser(client, { ...adminUser, email: 'nonadmin-cache@example.com' })

    const response = await client
      .get('/api/admin/ai-settings/cache/stats')
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(403)
  })
})

// ---------------------------------------------------------------------------
// Cache Purge
// ---------------------------------------------------------------------------
test.group('Admin Cache Purge', (group) => {
  group.each.setup(async () => {
    await cleanupAll()
  })

  test('admin can purge expired entries', async ({ client, assert }) => {
    const { token, userId } = await createUser(client, adminUser)
    await makeAdmin(userId)

    const now = DateTime.now()
    // Fresh entry
    await insertCacheEntry({
      entity_key: 'fresh',
      expires_at: now.plus({ days: 30 }).toSQL(),
    })
    // Expired entry
    await insertCacheEntry({
      entity_key: 'expired',
      fetched_at: now.minus({ days: 60 }).toSQL(),
      expires_at: now.minus({ days: 1 }).toSQL(),
    })

    const response = await client
      .post('/api/admin/ai-settings/cache/purge')
      .header('Authorization', `Bearer ${token}`)
      .json({})
    response.assertStatus(200)

    // Verify only fresh entry remains
    const remaining = await db.from('external_cache').select('*')
    assert.equal(remaining.length, 1)
    assert.equal(remaining[0].entity_key, 'fresh')
  })

  test('non-admin cannot purge cache', async ({ client }) => {
    const { token } = await createUser(client, { ...adminUser, email: 'nonadmin-purge@example.com' })

    const response = await client
      .post('/api/admin/ai-settings/cache/purge')
      .header('Authorization', `Bearer ${token}`)
      .json({})
    response.assertStatus(403)
  })
})
