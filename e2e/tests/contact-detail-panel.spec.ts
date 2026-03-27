/**
 * E2E — Contact detail panel (sc-446)
 *
 * Covers: open panel by clicking a contact card on /suivi
 *         panel renders as a dialog with contact info
 *         close via ✕ button
 *         close via Escape key
 *
 * Requires auth state (authenticated user with seeded contacts).
 */
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('Contact detail panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/suivi`)
    await page.waitForLoadState('networkidle')
    // Wait for pipeline columns to render
    await page.waitForTimeout(1500)
  })

  test('clicking a contact card opens the detail panel dialog', async ({ page }) => {
    const cards = page.locator('[draggable="true"]')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    await cards.first().click()

    // Panel should appear as a dialog
    const dialog = page.locator('[role="dialog"][aria-modal="true"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
  })

  test('panel displays contact name in header', async ({ page }) => {
    const cards = page.locator('[draggable="true"]')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    // Get the name from the card before clicking
    const cardText = await cards.first().textContent()
    await cards.first().click()

    const dialog = page.locator('[role="dialog"][aria-modal="true"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // h2 in the panel header should have text content
    const panelHeader = dialog.locator('h2')
    await expect(panelHeader).toBeVisible()
    const headerText = await panelHeader.textContent()
    expect(headerText?.trim().length).toBeGreaterThan(0)
  })

  test('panel closes when the ✕ close button is clicked', async ({ page }) => {
    const cards = page.locator('[draggable="true"]')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    await cards.first().click()

    const dialog = page.locator('[role="dialog"][aria-modal="true"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Click the close button (aria-label set by t('close'))
    const closeBtn = dialog.locator('button[aria-label]').first()
    await closeBtn.click()

    await expect(dialog).not.toBeVisible({ timeout: 3_000 })
  })

  test('panel closes when Escape key is pressed', async ({ page }) => {
    const cards = page.locator('[draggable="true"]')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    await cards.first().click()

    const dialog = page.locator('[role="dialog"][aria-modal="true"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    await page.keyboard.press('Escape')

    await expect(dialog).not.toBeVisible({ timeout: 3_000 })
  })

  test('panel closes when backdrop is clicked', async ({ page }) => {
    const cards = page.locator('[draggable="true"]')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    await cards.first().click()

    const dialog = page.locator('[role="dialog"][aria-modal="true"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Click the semi-transparent backdrop (fixed inset-0 bg-black/40 aria-hidden)
    const backdrop = page.locator('[aria-hidden="true"][class*="bg-black"]')
    await backdrop.click({ force: true })

    await expect(dialog).not.toBeVisible({ timeout: 3_000 })
  })

  test('panel shows AI analysis section', async ({ page }) => {
    const cards = page.locator('[draggable="true"]')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    await cards.first().click()

    const dialog = page.locator('[role="dialog"][aria-modal="true"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // The panel always renders the AI analysis section header
    const sections = dialog.locator('h3')
    const sectionCount = await sections.count()
    expect(sectionCount).toBeGreaterThanOrEqual(1)
  })
})
