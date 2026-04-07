/**
 * E2E — Full reset password flow (sc-185)
 *
 * Flow: forgot-password form → token from DB → /reset-password?token → new password → login
 *
 * Uses pg to fetch the reset token directly from the dev DB,
 * avoiding a dependency on a real mail server in tests.
 */
import { test, expect } from '@playwright/test'
import { Client } from 'pg'

const BASE = 'http://localhost:3000'
const API = 'http://localhost:3333'

const DB_CONFIG = {
  host: '127.0.0.1',
  port: 5432,
  user: 'expathunter',
  password: 'expathunter',
  database: 'expat_hunter_dev',
}

// Dedicated e2e user for this flow — separate from the global test user
const RESET_TEST_USER = {
  email: 'e2e-reset@expathunter.test',
  password: 'OriginalPassword123!',
  newPassword: 'NewPassword456!',
  fullName: 'E2E Reset User',
}

async function getResetToken(email: string): Promise<string | null> {
  const db = new Client(DB_CONFIG)
  await db.connect()
  try {
    const res = await db.query<{ token: string }>(
      `SELECT pr.token
       FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
       WHERE u.email = $1
         AND pr.used = false
         AND pr.expires_at > NOW()
       ORDER BY pr.created_at DESC
       LIMIT 1`,
      [email],
    )
    return res.rows[0]?.token ?? null
  } finally {
    await db.end()
  }
}

async function ensureResetUser(): Promise<void> {
  // Register if not exists, ignore conflict
  await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(RESET_TEST_USER),
  })
}

async function resetUserPasswordToOriginal(): Promise<void> {
  // Login and reset password back to original after test
  try {
    const loginRes = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: RESET_TEST_USER.email, password: RESET_TEST_USER.newPassword }),
    })
    if (!loginRes.ok) return

    await loginRes.json()

    // Update password back to original via profile or direct DB
    const db = new Client(DB_CONFIG)
    await db.connect()
    try {
      // Use bcrypt hash — easier to just call the reset flow again or leave as-is
      // For idempotency: we'll just re-register won't work, so we skip cleanup
      // The user password will be reset each test run via the forgot-password flow
    } finally {
      await db.end()
    }
  } catch {
    // Non-blocking — test isolation handled by using a dedicated user
  }
}

test.describe('Reset password — full flow (sc-185)', () => {
  // Run without stored auth state
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeAll(async () => {
    await ensureResetUser()
  })

  test('forgot-password success message is visible and readable', async ({ page }) => {
    await page.goto(`${BASE}/forgot-password`)
    await page.waitForLoadState('networkidle')

    await page.fill('input[type="email"]', RESET_TEST_USER.email)
    await page.click('button[type="submit"]')

    // Success message should appear
    const successMsg = page.getByText('Si un compte existe avec cet email')
    await expect(successMsg).toBeVisible({ timeout: 5000 })

    // Should still be on /forgot-password (not redirected)
    await expect(page).toHaveURL(`${BASE}/forgot-password`)
  })

  test('full flow: forgot-password → reset → login with new password', async ({ page }) => {
    // Step 1: Submit forgot-password
    await page.goto(`${BASE}/forgot-password`)
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', RESET_TEST_USER.email)
    await page.click('button[type="submit"]')
    await expect(page.getByText('Si un compte existe avec cet email')).toBeVisible({
      timeout: 5000,
    })

    // Step 2: Get reset token from DB
    const token = await getResetToken(RESET_TEST_USER.email)
    expect(token).toBeTruthy()

    // Step 3: Navigate to reset-password page with token
    await page.goto(`${BASE}/reset-password?token=${token}`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(new RegExp('/reset-password'))

    // Step 4: Fill in new password
    await page.fill('#password', RESET_TEST_USER.newPassword)
    await page.fill('#confirmPassword', RESET_TEST_USER.newPassword)
    await page.click('button[type="submit"]')

    // Step 5: Success message appears
    const successMsg = page.getByText('Votre mot de passe a été réinitialisé')
    await expect(successMsg).toBeVisible({ timeout: 5000 })

    // Step 6: Navigate to login and login with new password
    await page.click('a[href="/login"]')
    await page.waitForURL(`${BASE}/login`)
    await page.fill('input[type="email"]', RESET_TEST_USER.email)
    await page.fill('input[type="password"]', RESET_TEST_USER.newPassword)
    await page.click('button[type="submit"]')

    // Step 7: Authenticated — redirected to dashboard
    await page.waitForURL(`${BASE}/`, { timeout: 10000 })
    await expect(page).toHaveURL(`${BASE}/`)
  })

  test('reset-password with invalid token shows error', async ({ page }) => {
    await page.goto(`${BASE}/reset-password?token=invalidtoken000000000000000000000000000000000000000000000000000000`)
    await page.waitForLoadState('networkidle')

    await page.fill('#password', 'SomePassword123!')
    await page.fill('#confirmPassword', 'SomePassword123!')
    await page.click('button[type="submit"]')

    const errorMsg = page.getByText('Lien invalide ou expiré')
    await expect(errorMsg).toBeVisible({ timeout: 5000 })
  })

  test('reset-password without token shows invalid link message', async ({ page }) => {
    await page.goto(`${BASE}/reset-password`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Ce lien de réinitialisation est invalide')).toBeVisible()
    await expect(page.getByText('Demander un nouveau lien')).toBeVisible()
  })
})
