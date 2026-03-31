/**
 * Smoke test suite (sc-462)
 *
 * Fast critical-path checks that verify the app is alive after every push/deploy.
 * Covers: API health, authenticated session, all 9 main pages load without crash.
 * Target runtime: < 60 seconds.
 *
 * Run standalone: pnpm test:smoke
 * Used in CI: run before the full e2e suite.
 */
import { test, expect } from '@playwright/test'

const API_URL = process.env.API_URL ?? 'http://localhost:3333'
const BASE = 'http://localhost:3000'

// ---------------------------------------------------------------------------
// API smoke checks
// ---------------------------------------------------------------------------

test.describe('API smoke', () => {
  test('GET /health returns 200', async ({ request }) => {
    const res = await request.get(`${API_URL}/health`)
    expect(res.status()).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Frontend page smoke checks (authenticated via auth-state.json)
// ---------------------------------------------------------------------------

test.describe('Frontend pages smoke', () => {
  const pages: { name: string; path: string }[] = [
    { name: 'Dashboard', path: '/' },
    { name: 'Contacts', path: '/contacts' },
    { name: 'Suivi / Pipeline', path: '/suivi' },
    { name: 'Emails', path: '/emails' },
    { name: 'Paramètres', path: '/parametres' },
    { name: 'Profil', path: '/profil' },
    { name: 'Templates', path: '/templates' },
    { name: 'Presets', path: '/presets' },
    { name: 'Recherche', path: '/recherche' },
  ]

  for (const { name, path } of pages) {
    test(`${name} (${path}) loads without crash`, async ({ page }) => {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })

      // Must not redirect to login — if auth failed, this catches it
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })

      // Must not show a Next.js error page
      const errorHeading = page.locator('h2:has-text("Application error")')
      await expect(errorHeading).toHaveCount(0)

      // Page must contain at least one heading (basic render check)
      const heading = page.locator('h1')
      await expect(heading).toHaveCount(1, { timeout: 15_000 })
    })
  }
})
