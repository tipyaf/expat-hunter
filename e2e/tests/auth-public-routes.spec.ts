import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

// These tests run without auth state — unauthenticated user
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Auth guard — public routes accessible without login', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure no token in localStorage
    await page.goto(`${BASE}/login`)
    await page.evaluate(() => localStorage.removeItem('expathunter_token'))
  })

  test('unauthenticated user visits /forgot-password — stays on /forgot-password', async ({
    page,
  }) => {
    await page.goto(`${BASE}/forgot-password`)
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(`${BASE}/forgot-password`)
    await expect(page.getByText('Réinitialiser votre mot de passe')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('unauthenticated user visits /reset-password — stays on /reset-password', async ({
    page,
  }) => {
    await page.goto(`${BASE}/reset-password`)
    await page.waitForLoadState('networkidle')

    // Should not redirect to /login
    await expect(page).not.toHaveURL(`${BASE}/login`)
    // Should stay on /reset-password (may show a form or invalid-token message)
    await expect(page).toHaveURL(new RegExp('/reset-password'))
  })

  test('unauthenticated user on protected route / is redirected to /login', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(`${BASE}/login`)
  })

  test('clicking "Mot de passe oublié ?" on login page navigates to /forgot-password', async ({
    page,
  }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForLoadState('networkidle')

    await page.click('a[href="/forgot-password"]')
    await page.waitForURL(`${BASE}/forgot-password`, { timeout: 5000 })

    await expect(page).toHaveURL(`${BASE}/forgot-password`)
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })
})
