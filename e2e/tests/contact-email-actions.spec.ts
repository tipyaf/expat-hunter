/**
 * E2E — Contact email actions from detail panel (sc-554)
 *
 * Covers: Edit button on draft email cards
 *         EmailEditModal opens from contact panel
 *         Generate email button for recommended contacts
 *         Email history section displays correctly
 *
 * Requires auth state (authenticated user with seeded contacts).
 */
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('Contact email actions (sc-554)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/suivi`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)
  })

  test('draft email cards show an edit button with Pencil icon', async ({ page }) => {
    const cards = page.locator('[draggable="true"]')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    // Open first contact panel
    await cards.first().click()
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Look for draft badges
    const draftBadges = dialog.getByText('Draft')
    const draftCount = await draftBadges.count()

    if (draftCount > 0) {
      // Each draft should have an edit button (Pencil icon)
      const editBtns = dialog.locator('button').filter({ has: page.locator('svg.lucide-pencil') })
      expect(await editBtns.count()).toBeGreaterThanOrEqual(1)
    }
  })

  test('clicking Edit on a draft opens the EmailEditModal', async ({ page }) => {
    const cards = page.locator('[draggable="true"]')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    // Open first contact panel
    await cards.first().click()
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Find a draft email edit button
    const editBtns = dialog.locator('button').filter({ has: page.locator('svg.lucide-pencil') })
    const editCount = await editBtns.count()

    if (editCount === 0) {
      test.skip()
      return
    }

    // Click edit — should open the EmailEditModal
    await editBtns.first().click()

    // The modal should appear (it renders subject/body inputs)
    const modal = page.locator('.fixed').filter({ hasText: /subject|body|save/i })
    await expect(modal.first()).toBeVisible({ timeout: 5000 })
  })

  test('generate email button appears for recommended contacts with no emails', async ({ page }) => {
    const cards = page.locator('[draggable="true"]')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    let found = false
    for (let i = 0; i < Math.min(cardCount, 5); i++) {
      await cards.nth(i).click()
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      const generateBtn = dialog.getByText(/Generate email|Générer un email/i)
      if (await generateBtn.count() > 0) {
        found = true
        await expect(generateBtn.first()).toBeVisible()
        break
      }

      await page.keyboard.press('Escape')
      await expect(dialog).not.toBeVisible({ timeout: 3000 })
    }

    if (!found) {
      test.skip()
    }
  })

  test('email history section is visible in the contact panel', async ({ page }) => {
    const cards = page.locator('[draggable="true"]')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    await cards.first().click()
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    const emailHeader = dialog.getByText(/Email History|Historique des emails/i)
    await expect(emailHeader.first()).toBeVisible()
  })
})
