import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto(`${BASE}/login`)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => {
    localStorage.removeItem('expathunter_token')
  })
  await page.goto(`${BASE}/login`)
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  const submitBtn = page.locator('button[type="submit"]')
  await submitBtn.waitFor({ state: 'visible' })
  await page.waitForTimeout(200)
  await submitBtn.click()
  await page.waitForURL(`${BASE}/`, { timeout: 15000 })
}

test.describe('Epic 1 V2 — New navigation labels', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ya.net@hotmail.fr', 'password123')
  })

  test('Sidebar shows user-friendly French labels', async ({ page }) => {
    const sidebar = page.locator('aside')
    await expect(sidebar).toContainText('Tableau de bord')
    await expect(sidebar).toContainText('Trouver des contacts')
    await expect(sidebar).toContainText('Mes contacts')
    await expect(sidebar).toContainText('Mes emails')
    await expect(sidebar).toContainText('Suivi')
    await expect(sidebar).toContainText('Mon profil')
    await expect(sidebar).toContainText('Paramètres')
  })

  test('Sidebar uses Lucide icons (SVG elements)', async ({ page }) => {
    // Ensure we're on desktop viewport where sidebar is visible
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    // Wait for sidebar nav to render
    await page.locator('aside nav').waitFor({ state: 'visible', timeout: 10000 })
    const navLinks = page.locator('aside nav a')
    const count = await navLinks.count()
    expect(count).toBeGreaterThanOrEqual(5)
    for (let i = 0; i < Math.min(count, 5); i++) {
      const svg = navLinks.nth(i).locator('svg')
      await expect(svg).toBeVisible()
    }
  })

  test('Navigation links point to new routes', async ({ page }) => {
    await expect(page.locator('aside nav a[href="/recherche"]')).toBeVisible()
    await expect(page.locator('aside nav a[href="/suivi"]')).toBeVisible()
    await expect(page.locator('aside nav a[href="/profil"]')).toBeVisible()
    await expect(page.locator('aside nav a[href="/parametres"]')).toBeVisible()
  })

  test('Clicking "Trouver des contacts" navigates to /recherche', async ({ page }) => {
    await page.click('aside nav a[href="/recherche"]')
    await page.waitForURL(`${BASE}/recherche`)
    expect(page.url()).toBe(`${BASE}/recherche`)
  })

  test('Clicking "Suivi" navigates to /suivi', async ({ page }) => {
    await page.click('aside nav a[href="/suivi"]')
    await page.waitForURL(`${BASE}/suivi`)
    expect(page.url()).toBe(`${BASE}/suivi`)
  })
})

test.describe('Epic 1 V2 — Old URL redirections', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ya.net@hotmail.fr', 'password123')
  })

  test('/sourcing redirects to /recherche', async ({ page }) => {
    await page.goto(`${BASE}/sourcing`)
    await page.waitForURL('**/recherche')
    expect(page.url()).toContain('/recherche')
  })

  test('/pipeline redirects to /suivi', async ({ page }) => {
    await page.goto(`${BASE}/pipeline`)
    await page.waitForURL('**/suivi')
    expect(page.url()).toContain('/suivi')
  })

  test('/profile redirects to /profil', async ({ page }) => {
    await page.goto(`${BASE}/profile`)
    await page.waitForURL('**/profil')
    expect(page.url()).toContain('/profil')
  })

  test('/settings redirects to /parametres', async ({ page }) => {
    await page.goto(`${BASE}/settings`)
    await page.waitForURL('**/parametres')
    expect(page.url()).toContain('/parametres')
  })
})

test.describe('Epic 1 V2 — ProactiveTip on dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ya.net@hotmail.fr', 'password123')
  })

  test('Dashboard shows a ProactiveTip with expert advice', async ({ page }) => {
    // The tip should be visible with the lightbulb icon
    const tip = page.locator('[class*="rounded"]').filter({ has: page.locator('svg') }).filter({ hasText: /profil|recherche/i })
    await expect(tip.first()).toBeVisible()
  })

  test('ProactiveTip is dismissible', async ({ page }) => {
    // Find the tip close button
    const closeBtn = page.locator('button[aria-label="Fermer le conseil"]')
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
      await expect(closeBtn).not.toBeVisible()
    }
  })
})

test.describe('Epic 1 V2 — Dashboard title updated', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ya.net@hotmail.fr', 'password123')
  })

  test('Dashboard title is "Tableau de bord"', async ({ page }) => {
    const h1 = page.locator('h1')
    await expect(h1).toContainText('Tableau de bord')
  })
})
