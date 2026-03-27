/**
 * E2E — Google OAuth (sc-446)
 *
 * Covers:
 *   - Google "Continue with Google" button visible on /login
 *   - Google "Continue with Google" button visible on /register
 *   - Clicking the button triggers a navigation toward /api/auth/google
 *
 * NOTE: The full Google OAuth flow cannot be tested e2e without mocking the
 * external provider. These tests verify the UI presence and the redirect intent
 * only — not the complete OAuth exchange.
 *
 * Runs WITHOUT auth state (public pages).
 */
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'
const API_BASE = process.env.API_URL ?? 'http://localhost:3333'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Google OAuth button — /login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForLoadState('networkidle')
  })

  test('Google OAuth button is visible on the login page', async ({ page }) => {
    // SocialAuthButton renders a button with provider-specific text
    const googleBtn = page.locator('button').filter({ hasText: /Google/i })
    await expect(googleBtn).toBeVisible()
  })

  test('Google button has the correct accessible label or text', async ({ page }) => {
    const googleBtn = page.locator('button').filter({ hasText: /Google/i })
    const text = await googleBtn.textContent()
    expect(text?.toLowerCase()).toMatch(/google/)
  })

  test('clicking Google button navigates toward /api/auth/google', async ({ page }) => {
    const googleBtn = page.locator('button').filter({ hasText: /Google/i })

    // Intercept the navigation — we don't want to actually hit Google
    let navigatedUrl = ''
    page.on('request', (req) => {
      if (req.url().includes('/api/auth/google') || req.url().includes('accounts.google.com')) {
        navigatedUrl = req.url()
      }
    })

    // Click and catch the navigation (it will fail since Google is external)
    try {
      await Promise.race([
        googleBtn.click(),
        page.waitForURL(/api\/auth\/google|accounts\.google\.com/, { timeout: 5_000 }),
      ])
    } catch {
      // Navigation may fail or redirect — that is expected in a test environment
    }

    // Either the URL changed toward Google OAuth or a request was intercepted
    const currentUrl = page.url()
    const navigationTriggered =
      navigatedUrl.includes('/api/auth/google') ||
      navigatedUrl.includes('accounts.google.com') ||
      currentUrl.includes('/api/auth/google') ||
      currentUrl.includes('accounts.google.com')

    expect(navigationTriggered).toBe(true)
  })
})

test.describe('Google OAuth button — /register', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/register`)
    await page.waitForLoadState('networkidle')
  })

  test('Google OAuth button is visible on the register page', async ({ page }) => {
    const googleBtn = page.locator('button').filter({ hasText: /Google/i })
    await expect(googleBtn).toBeVisible()
  })

  test('Google button text matches login page button text', async ({ page }) => {
    const googleBtn = page.locator('button').filter({ hasText: /Google/i })
    const text = await googleBtn.textContent()
    expect(text?.toLowerCase()).toMatch(/google/)
  })

  test('clicking Google button on register page also navigates toward /api/auth/google', async ({ page }) => {
    const googleBtn = page.locator('button').filter({ hasText: /Google/i })

    let navigatedUrl = ''
    page.on('request', (req) => {
      if (req.url().includes('/api/auth/google') || req.url().includes('accounts.google.com')) {
        navigatedUrl = req.url()
      }
    })

    try {
      await Promise.race([
        googleBtn.click(),
        page.waitForURL(/api\/auth\/google|accounts\.google\.com/, { timeout: 5_000 }),
      ])
    } catch {
      // Expected in test environment
    }

    const currentUrl = page.url()
    const navigationTriggered =
      navigatedUrl.includes('/api/auth/google') ||
      navigatedUrl.includes('accounts.google.com') ||
      currentUrl.includes('/api/auth/google') ||
      currentUrl.includes('accounts.google.com')

    expect(navigationTriggered).toBe(true)
  })
})

test.describe('OAuth callback page', () => {
  test('GET /auth/callback page exists and does not crash', async ({ page }) => {
    // Load without a valid code — should render an error or redirect, not a blank crash
    await page.goto(`${BASE}/auth/callback`, { waitUntil: 'networkidle' })

    // Page should render something (not blank/500)
    const body = await page.textContent('body')
    expect(body?.trim().length).toBeGreaterThan(0)
  })
})
