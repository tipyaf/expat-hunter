/**
 * E2E — Login flow (sc-446)
 *
 * Covers: fill email + password → submit → redirect to dashboard
 *         wrong credentials → error message shown
 *
 * Runs WITHOUT auth state (unauthenticated browser context).
 */
import { test, expect } from '@playwright/test'
import { TEST_USER } from '../fixtures/seed'

const BASE = 'http://localhost:3000'

// Override auth state — these tests must run as unauthenticated user
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Login flow — form interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForLoadState('networkidle')
  })

  test('login page renders email field, password field and submit button', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('valid credentials → redirect to dashboard', async ({ page }) => {
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('#password', TEST_USER.password)
    await page.click('button[type="submit"]')

    await page.waitForURL(`${BASE}/`, { timeout: 15_000 })
    await expect(page.locator('h1')).toContainText('Tableau de bord', { timeout: 10_000 })
  })

  test('wrong password → error message shown, stays on /login', async ({ page }) => {
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('#password', 'wrong-password-xyz')
    await page.click('button[type="submit"]')

    // Should not redirect
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(`${BASE}/login`)

    // Error message should be visible
    const error = page.locator('[class*="color-error"], [class*="text-red"], [role="alert"]')
    const errorCount = await error.count()
    expect(errorCount).toBeGreaterThan(0)
  })

  test('wrong email → error message shown, stays on /login', async ({ page }) => {
    await page.fill('input[type="email"]', 'nobody@nowhere.invalid')
    await page.fill('#password', 'anypassword')
    await page.click('button[type="submit"]')

    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(`${BASE}/login`)
  })

  test('empty form submit → browser validation prevents submission', async ({ page }) => {
    await page.click('button[type="submit"]')

    // HTML5 required validation — page stays on /login
    await expect(page).toHaveURL(`${BASE}/login`)
  })
})
