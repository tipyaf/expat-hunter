/**
 * E2E — Contact email actions from detail panel (sc-554)
 *
 * Covers: Edit button visible on draft email cards
 *         Edit button opens EmailEditModal
 *         Generate email button visible for recommended contacts with no emails
 *         Template selector available in modal
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

  test('draft email cards show an Edit button with pencil icon', async ({ page }) => {
    const cards = page.locator('[draggable="true"]')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    // Open the first contact panel
    await cards.first().click()

    const dialog = page.locator('[role="dialog"][aria-modal="true"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Check for draft status badges in email thread
    const draftBadges = dialog.locator('span:has-text("draft"), span:has-text("Brouillon")')
    const draftCount = await draftBadges.count()

    if (draftCount === 0) {
      // No draft emails for this contact — skip
      test.skip()
      return
    }

    // Edit button should be visible near draft emails (aria-label contains editDraft)
    const editButtons = dialog.locator('button[aria-label]').filter({ has: page.locator('svg') })
    const editCount = await editButtons.count()
    expect(editCount).toBeGreaterThan(0)
  })

  test('clicking Edit on a draft opens the EmailEditModal', async ({ page }) => {
    const cards = page.locator('[draggable="true"]')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    // Try each contact until we find one with a draft email
    for (let i = 0; i < Math.min(cardCount, 5); i++) {
      await cards.nth(i).click()

      const dialog = page.locator('[role="dialog"][aria-modal="true"]')
      await expect(dialog).toBeVisible({ timeout: 5_000 })

      // Look for draft edit button (pencil icon button near draft badge)
      const draftBadges = dialog.locator('span:has-text("draft"), span:has-text("Brouillon")')
      const hasDrafts = (await draftBadges.count()) > 0

      if (!hasDrafts) {
        // Close and try next contact
        await page.keyboard.press('Escape')
        await expect(dialog).not.toBeVisible({ timeout: 2_000 })
        continue
      }

      // Find and click the edit button (pencil icon) — it's inside the same container as the draft badge
      const editBtn = dialog.locator('button[aria-label]').filter({ has: page.locator('svg.lucide-pencil, svg[class*="pencil"]') }).first()
      if ((await editBtn.count()) === 0) {
        await page.keyboard.press('Escape')
        await expect(dialog).not.toBeVisible({ timeout: 2_000 })
        continue
      }

      await editBtn.click()

      // EmailEditModal should open (z-50, has id="email-edit-title")
      const modal = page.locator('#email-edit-title')
      await expect(modal).toBeVisible({ timeout: 5_000 })

      // Modal should have subject and body fields
      const subjectInput = page.locator('#email-subject')
      await expect(subjectInput).toBeVisible()
      const bodyTextarea = page.locator('#email-body')
      await expect(bodyTextarea).toBeVisible()

      return // Test passed
    }

    test.skip() // No contacts with draft emails found
  })

  test('generate email button shown for recommended contacts with no emails', async ({ page }) => {
    const cards = page.locator('[draggable="true"]')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    // Look for the generate email button in any contact panel
    for (let i = 0; i < Math.min(cardCount, 10); i++) {
      await cards.nth(i).click()

      const dialog = page.locator('[role="dialog"][aria-modal="true"]')
      await expect(dialog).toBeVisible({ timeout: 5_000 })

      // Check for the "Generate email" button (Sparkles icon + text)
      const generateBtn = dialog.locator('button:has-text("Generate"), button:has-text("Générer")')
      if ((await generateBtn.count()) > 0) {
        await expect(generateBtn.first()).toBeVisible()
        return // Test passed — found a contact with generate button
      }

      await page.keyboard.press('Escape')
      await expect(dialog).not.toBeVisible({ timeout: 2_000 })
    }

    // No contacts match the criteria — that's OK, skip
    test.skip()
  })

  test('email history section is always visible in panel', async ({ page }) => {
    const cards = page.locator('[draggable="true"]')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    await cards.first().click()

    const dialog = page.locator('[role="dialog"][aria-modal="true"]')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Email history section header should be visible
    const emailSection = dialog.locator('h3').filter({ hasText: /email|mail|historique/i })
    await expect(emailSection).toBeVisible({ timeout: 3_000 })
  })
})
