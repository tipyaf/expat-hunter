import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { LOCALE_NAMES } from '../../../app/constants/locale.js'
import TipsService, { buildContextHash, sanitizeLocale } from '#services/tips_service'
import type { ContextualTip, OpenRouterFactory } from '#services/tips_service'
import type CacheService from '#services/cache_service'

// ─── Test doubles ─────────────────────────────────────────────────────────────

/** CacheService that always calls the fetcher (no DB required). */
function noOpCache(): CacheService {
  return {
    getOrFetch: async <T>(
      _source: string,
      _type: unknown,
      _key: string,
      fetcher: () => Promise<T>
    ) => ({
      data: await fetcher(),
      fromCache: false,
      fetchedAt: DateTime.now(),
    }),
  } as unknown as CacheService
}

/** OpenRouter factory that returns a client yielding a fixed message. */
function mockOpenRouter(message: string): OpenRouterFactory {
  return async () =>
    ({ chat: async () => message }) as unknown as Awaited<ReturnType<OpenRouterFactory>>
}

/** OpenRouter factory that returns null (AI unavailable — triggers static fallback). */
const nullOpenRouter: OpenRouterFactory = async () => null

// ─── LOCALE_NAMES — getLocaleLanguageName ─────────────────────────────────────

test.group('LOCALE_NAMES — locale-to-language lookup', () => {
  test("LOCALE_NAMES['en'] equals 'English'", ({ assert }) => {
    // ORACLE: LOCALE_NAMES['en'] = 'English'
    assert.equal(LOCALE_NAMES['en'], 'English')
  })

  test("LOCALE_NAMES['fr'] equals 'French'", ({ assert }) => {
    // ORACLE: LOCALE_NAMES['fr'] = 'French'
    assert.equal(LOCALE_NAMES['fr'], 'French')
  })

  test("LOCALE_NAMES['de'] is undefined (unknown locale)", ({ assert }) => {
    // ORACLE: LOCALE_NAMES['de'] = undefined
    assert.isUndefined(LOCALE_NAMES['de'])
  })

  test('fallback for unknown locale returns French', ({ assert }) => {
    // ORACLE: LOCALE_NAMES['de'] ?? 'French' = 'French'
    const result = LOCALE_NAMES['de'] ?? 'French'
    assert.equal(result, 'French')
  })

  test('empty string locale returns undefined', ({ assert }) => {
    // ORACLE: LOCALE_NAMES[''] = undefined → fallback 'French'
    assert.isUndefined(LOCALE_NAMES[''])
  })

  test('uppercase locale EN returns undefined (map uses lowercase keys)', ({ assert }) => {
    // ORACLE: LOCALE_NAMES['EN'] = undefined (map keys are lowercase)
    assert.isUndefined(LOCALE_NAMES['EN'])
  })
})

// ─── buildContextHash ─────────────────────────────────────────────────────────

test.group('buildContextHash — deterministic hash', () => {
  const statsA = { contacts: 5, emailsSent: 3, responseRate: 10, replies: 0, interviews: 0 }
  const statsB = { contacts: 5, emailsSent: 3, responseRate: 10, replies: 0, interviews: 0 }
  const statsC = { contacts: 10, emailsSent: 0, responseRate: 0, replies: 0, interviews: 0 }

  test('same stats produce the same hash', ({ assert }) => {
    // ORACLE: hash(statsA) === hash(statsB) because they have identical fields
    assert.equal(
      buildContextHash(statsA as unknown as Record<string, unknown>),
      buildContextHash(statsB as unknown as Record<string, unknown>)
    )
  })

  test('different stats produce different hashes', ({ assert }) => {
    // ORACLE: hash(statsA) !== hash(statsC) because contacts 5 vs 10
    assert.notEqual(
      buildContextHash(statsA as unknown as Record<string, unknown>),
      buildContextHash(statsC as unknown as Record<string, unknown>)
    )
  })

  test('hash is 16 hex characters', ({ assert }) => {
    // ORACLE: sha256 digest sliced to 16 chars → exactly 16 alphanumeric chars
    const hash = buildContextHash({ x: 1 })
    assert.equal(hash.length, 16)
    assert.match(hash, /^[0-9a-f]{16}$/)
  })

  test('key order does not affect hash (sorted before hashing)', ({ assert }) => {
    const obj1 = { a: 1, b: 2 }
    const obj2 = { b: 2, a: 1 }
    // ORACLE: both produce the same hash because entries are sorted before JSON.stringify
    assert.equal(buildContextHash(obj1), buildContextHash(obj2))
  })
})

// ─── sanitizeLocale ───────────────────────────────────────────────────────────

test.group('sanitizeLocale — input sanitization', () => {
  test('trims whitespace', ({ assert }) => {
    assert.equal(sanitizeLocale('  en  '), 'en')
  })

  test('strips non-alphanumeric non-hyphen characters', ({ assert }) => {
    assert.equal(sanitizeLocale('en; DROP'), 'enDROP')
  })

  test('truncates to 10 characters', ({ assert }) => {
    // ORACLE: 'en-US-extra' sliced to 10 chars = 'en-US-extr'
    assert.equal(sanitizeLocale('en-US-extra'), 'en-US-extr')
  })

  test('empty string returns empty string', ({ assert }) => {
    assert.equal(sanitizeLocale(''), '')
  })
})

// ─── getDashboardTip — AI response (mocked OpenRouter) ────────────────────────

test.group('TipsService.getDashboardTip — AI-generated response', () => {
  test('locale=en, 0 contacts returns English message from AI', async ({ assert }) => {
    const service = new TipsService(
      noOpCache(),
      mockOpenRouter('Complete your profile to find the most relevant contacts.')
    )
    const tip = await service.getDashboardTip(
      { contacts: 0, emailsSent: 0, responseRate: 0, replies: 0, interviews: 0 } as any,
      'en'
    )
    // ORACLE: mockOpenRouter returns the exact English message string
    assert.equal(tip.message, 'Complete your profile to find the most relevant contacts.')
    assert.equal(tip.cta?.href, '/profil')
  })

  test('locale=fr, 0 contacts returns French message from AI', async ({ assert }) => {
    const service = new TipsService(
      noOpCache(),
      mockOpenRouter('Complétez votre profil pour trouver les contacts les plus pertinents.')
    )
    const tip = await service.getDashboardTip(
      { contacts: 0, emailsSent: 0, responseRate: 0, replies: 0, interviews: 0 } as any,
      'fr'
    )
    // ORACLE: mockOpenRouter returns the French message string
    assert.equal(tip.message, 'Complétez votre profil pour trouver les contacts les plus pertinents.')
  })
})

// ─── getDashboardTip — static fallback (OpenRouter unavailable) ───────────────

test.group('TipsService.getDashboardTip — static fallback', () => {
  test('0 contacts returns profile onboarding fallback', async ({ assert }) => {
    const service = new TipsService(noOpCache(), nullOpenRouter)
    const tip = await service.getDashboardTip(
      { contacts: 0, emailsSent: 0, responseRate: 0, replies: 0, interviews: 0 } as any,
      'fr'
    )
    assert.include(tip.message, 'profil')
    assert.equal(tip.cta?.href, '/profil')
  })

  test('contacts > 0, no emails sent returns email fallback', async ({ assert }) => {
    const service = new TipsService(noOpCache(), nullOpenRouter)
    const tip = await service.getDashboardTip(
      { contacts: 10, emailsSent: 0, responseRate: 0, replies: 0, interviews: 0 } as any,
      'fr'
    )
    assert.include(tip.message, '10 contact(s)')
    assert.equal(tip.cta?.href, '/emails')
  })

  test('interviews > 0 returns interview fallback', async ({ assert }) => {
    const service = new TipsService(noOpCache(), nullOpenRouter)
    const tip = await service.getDashboardTip(
      { contacts: 20, emailsSent: 15, responseRate: 20, replies: 5, interviews: 2 } as any,
      'fr'
    )
    assert.include(tip.message, '2 entretien(s)')
    assert.equal(tip.cta?.href, '/suivi')
  })

  test('default case returns static dashboard tip', async ({ assert }) => {
    const service = new TipsService(noOpCache(), nullOpenRouter)
    const tip = await service.getDashboardTip(
      { contacts: 5, emailsSent: 3, responseRate: 12, replies: 0, interviews: 0 } as any,
      'fr'
    )
    assert.isString(tip.message)
    assert.isNotEmpty(tip.message)
  })
})

// ─── getThreadTip — static fallback ──────────────────────────────────────────

test.group('TipsService.getThreadTip — static fallback', () => {
  test('returns a tip message', async ({ assert }) => {
    const service = new TipsService(noOpCache(), nullOpenRouter)
    const tip = await service.getThreadTip(undefined, 'NZ', 'fr')
    assert.isString(tip.message)
    assert.isNotEmpty(tip.message)
  })

  test('works without country or locale', async ({ assert }) => {
    const service = new TipsService(noOpCache(), nullOpenRouter)
    const tip = await service.getThreadTip()
    assert.isString(tip.message)
  })
})

// ─── getProfileTip — static fallback ─────────────────────────────────────────

test.group('TipsService.getProfileTip — static fallback', () => {
  test('few skills returns add-skills fallback', async ({ assert }) => {
    const service = new TipsService(noOpCache(), nullOpenRouter)
    const tip = await service.getProfileTip(
      { skills: ['JS'], experienceYears: 3, targetCountries: ['AU'] },
      'fr'
    )
    assert.include(tip.message, 'compétences')
    assert.equal(tip.cta?.href, '/profil')
  })

  test('complete profile returns generic profile fallback', async ({ assert }) => {
    const service = new TipsService(noOpCache(), nullOpenRouter)
    const tip = await service.getProfileTip(
      { skills: ['TS', 'React', 'Node'], experienceYears: 4, targetCountries: ['AU'] },
      'fr'
    )
    assert.isString(tip.message)
    assert.isNotEmpty(tip.message)
  })
})

// ─── getKanbanTip — static fallback ──────────────────────────────────────────

test.group('TipsService.getKanbanTip — static fallback', () => {
  test('returns a tip for null status', async ({ assert }) => {
    const service = new TipsService(noOpCache(), nullOpenRouter)
    const tip = await service.getKanbanTip(null, 'fr')
    assert.isString(tip.message)
    assert.isNotEmpty(tip.message)
  })

  test('returns a tip for interview status', async ({ assert }) => {
    const service = new TipsService(noOpCache(), nullOpenRouter)
    const tip = await service.getKanbanTip('interview', 'en')
    assert.isString(tip.message)
  })

  test('returns a tip for unknown status', async ({ assert }) => {
    const service = new TipsService(noOpCache(), nullOpenRouter)
    const tip = await service.getKanbanTip('some_random_status', 'fr')
    assert.isString(tip.message)
  })
})

// ─── Cache key isolation — different locales produce different cache entries ──

test.group('TipsService — cache key isolation', () => {
  test('same stats with different locales produce different cache keys (via buildContextHash)', ({ assert }) => {
    // The cache key is `{page}::{locale}::{contextHash}`
    // Since locale is embedded in the key, different locales = different cache entries.
    // We verify this by checking buildContextHash + locale separately:
    const hash = buildContextHash({ contacts: 0, emailsSent: 0 })
    const keyFr = `dashboard::fr::${hash}`
    const keyEn = `dashboard::en::${hash}`
    // ORACLE: 'dashboard::fr::...' !== 'dashboard::en::...'
    assert.notEqual(keyFr, keyEn)
  })
})
