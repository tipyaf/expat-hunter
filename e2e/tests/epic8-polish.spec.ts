import { test, expect } from '@playwright/test'

// Override global storageState — tests in this file manage their own auth
test.use({ storageState: { cookies: [], origins: [] } })

async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('http://localhost:3000/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  const submitBtn = page.locator('button[type="submit"]')
  await submitBtn.waitFor({ state: 'visible' })
  await page.waitForTimeout(200)
  await submitBtn.click()
  await page.waitForURL('http://localhost:3000/', { timeout: 15000 })
}

test.describe('Epic 8 — Dark mode', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ya.net@hotmail.fr', 'password123')
  })

  test('Dark mode toggle applies dark class to html', async ({ page }) => {
    await page.goto('http://localhost:3000/parametres')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /sombre/i }).click()
    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).toContain('dark')
  })

  test('Light mode removes dark class', async ({ page }) => {
    await page.goto('http://localhost:3000/parametres')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /sombre/i }).click()
    await page.getByRole('button', { name: /^Clair$/i }).click()
    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass ?? '').not.toContain('dark')
  })

  test('Dark mode persists across navigation', async ({ page }) => {
    await page.goto('http://localhost:3000/parametres')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /sombre/i }).click()
    await page.goto('http://localhost:3000/')
    await page.waitForLoadState('networkidle')

    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).toContain('dark')

    // Cleanup: reset to auto
    await page.goto('http://localhost:3000/parametres')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /automatique/i }).click()
  })
})

test.describe('Epic 8 — Responsive sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ya.net@hotmail.fr', 'password123')
  })

  test('Hamburger button visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    const hamburger = page.getByRole('button', { name: /ouvrir le menu/i })
    await expect(hamburger).toBeVisible()
  })

  test('Sidebar offscreen by default on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    // Sidebar should be visually outside the viewport (fixed -translate-x-full)
    const sidebarBox = await page.locator('aside').boundingBox()
    expect(sidebarBox).toBeTruthy()
    if (sidebarBox) {
      // If translated off-screen, its right edge should be <= 0
      expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(0)
    }
  })

  test('Clicking hamburger makes close button visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /ouvrir le menu/i }).click()
    const closeButton = page.getByRole('button', { name: /fermer le menu/i })
    await expect(closeButton).toBeVisible()
  })

  test('Hamburger button hidden on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    const hamburger = page.getByRole('button', { name: /ouvrir le menu/i })
    await expect(hamburger).toBeHidden()
  })
})

test.describe('Epic 8 — Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ya.net@hotmail.fr', 'password123')
  })

  test('Skip to content link exists', async ({ page }) => {
    const skipLink = page.locator('a[href="#main-content"]')
    await expect(skipLink).toBeAttached()
  })

  test('Main content area has id="main-content"', async ({ page }) => {
    const main = page.locator('#main-content')
    await expect(main).toBeVisible()
  })

  test('Active nav item has aria-current="page"', async ({ page }) => {
    const activeLink = page.locator('nav a[aria-current="page"]')
    await expect(activeLink).toBeAttached()
  })

  test('Settings dark mode buttons have aria-pressed', async ({ page }) => {
    await page.goto('http://localhost:3000/parametres')
    await page.waitForLoadState('networkidle')
    const themeButtons = page.locator('button[aria-pressed]')
    const count = await themeButtons.count()
    expect(count).toBe(3)
  })

  test('Pipeline badge text is translated (not raw key)', async ({ page }) => {
    await page.goto('http://localhost:3000/suivi')
    await page.waitForLoadState('networkidle')
    const pageContent = await page.textContent('body')
    expect(pageContent).not.toContain('pipeline.relevance_')
    expect(pageContent).not.toContain('pipeline.email_')
  })
})

test.describe('Epic 8 — i18n completeness', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ya.net@hotmail.fr', 'password123')
  })

  test('Sourcing page shows translated country names', async ({ page }) => {
    await page.goto('http://localhost:3000/recherche')
    await page.waitForLoadState('networkidle')
    const countrySelect = page.locator('select#country')
    const firstOption = countrySelect.locator('option').first()
    const optionText = await firstOption.textContent()
    expect(optionText).toContain('Zélande')
  })
})

// Login page test: no auth needed — check placeholder without being logged in
test('Login page uses translated email placeholder', async ({ page }) => {
  await page.goto('http://localhost:3000/login')
  await page.waitForLoadState('networkidle')
  const emailInput = page.locator('input[type="email"]')
  await emailInput.waitFor({ state: 'visible' })
  const placeholder = await emailInput.getAttribute('placeholder')
  expect(placeholder).toBeTruthy()
  expect(placeholder).not.toBe('')
})
