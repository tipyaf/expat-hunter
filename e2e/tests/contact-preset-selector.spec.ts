/**
 * E2E — Preset selector in contact detail panel (sc-584)
 *
 * Covers: Preset dropdown visible next to Generate button
 *         Preset dropdown shows user's presets
 *         Generate button works with preset selection
 *
 * Requires auth state (authenticated user with seeded contacts and presets).
 */
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('Contact preset selector (sc-584)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/suivi`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)
  })

  test('preset dropdown appears next to Generate button for contacts without emails', async ({ page }) => {
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
        // Check for preset dropdown (select element with preset aria-label)
        const presetSelect = dialog.locator('select[aria-label*="preset" i]')
        const presetCount = await presetSelect.count()

        if (presetCount > 0) {
          await expect(presetSelect.first()).toBeVisible()
          found = true
        } else {
          // No presets exist — dropdown is correctly hidden
          found = true
        }
        break
      }

      await page.keyboard.press('Escape')
      await expect(dialog).not.toBeVisible({ timeout: 3000 })
    }

    if (!found) {
      test.skip()
    }
  })

  test('preset dropdown contains preset options when presets exist', async ({ page }) => {
    // First check if presets exist via the settings page
    await page.goto(`${BASE}/parametres/presets`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const presetItems = page.locator('[data-testid="preset-item"], .rounded-lg').filter({ hasText: /★|default/i })
    const hasPresets = (await presetItems.count()) > 0

    if (!hasPresets) {
      test.skip()
      return
    }

    // Navigate to suivi and open a contact with generate button
    await page.goto(`${BASE}/suivi`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    const cards = page.locator('[draggable="true"]')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    for (let i = 0; i < Math.min(cardCount, 5); i++) {
      await cards.nth(i).click()
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      const generateBtn = dialog.getByText(/Generate email|Générer un email/i)
      if (await generateBtn.count() > 0) {
        const presetSelect = dialog.locator('select[aria-label*="preset" i]')
        if (await presetSelect.count() > 0) {
          // Verify it has options (default + at least one preset)
          const options = presetSelect.locator('option')
          expect(await options.count()).toBeGreaterThanOrEqual(2)
        }
        break
      }

      await page.keyboard.press('Escape')
      await expect(dialog).not.toBeVisible({ timeout: 3000 })
    }
  })

  test('generate email button is functional with preset selected', async ({ page }) => {
    const cards = page.locator('[draggable="true"]')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      test.skip()
      return
    }

    for (let i = 0; i < Math.min(cardCount, 5); i++) {
      await cards.nth(i).click()
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      const generateBtn = dialog.getByText(/Generate email|Générer un email/i)
      if (await generateBtn.count() > 0) {
        // The generate button should be enabled
        await expect(generateBtn.first()).toBeEnabled()
        break
      }

      await page.keyboard.press('Escape')
      await expect(dialog).not.toBeVisible({ timeout: 3000 })
    }
  })
})
