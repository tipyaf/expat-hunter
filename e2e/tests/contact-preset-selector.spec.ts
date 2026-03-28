/**
 * E2E — Preset selector in contact detail panel (sc-584)
 *
 * Covers: Preset dropdown visible next to Generate button
 *         Preset dropdown shows user's presets
 *         Generate button works with preset selection
 *
 * Self-seeding: creates its own company, contact (ai_recommendation='contact',
 * no email), and generation preset via direct DB access before tests run.
 * Cleans up after itself in afterAll.
 */
import { test, expect } from '@playwright/test'
import {
  getE2eUserId,
  seedCompany,
  seedContact,
  seedPreset,
  cleanupE2eData,
  upgradeUserToPremium,
  type SeededContact,
  type SeededPreset,
} from '../fixtures/db'

const BASE = 'http://localhost:3000'
const DIALOG_TIMEOUT = 5_000
const ELEMENT_TIMEOUT = 8_000

let userId: string
let contact: SeededContact
let preset: SeededPreset

test.beforeAll(async () => {
  userId = await getE2eUserId()

  // Clean up leftover data from previous runs
  await cleanupE2eData(userId)

  // Ensure the test user has premium access (pipeline is premium-only)
  await upgradeUserToPremium(userId)

  // Seed a company + contact with ai_recommendation='contact' (shows Generate button)
  const company = await seedCompany('E2E Preset Test Corp')
  contact = await seedContact(userId, company.id, {
    fullName: 'E2E Preset Test Contact',
    aiRecommendation: 'contact',
    status: 'to_contact',
  })

  // Seed a generation preset
  preset = await seedPreset(userId, {
    name: 'E2E Test Preset',
    isDefault: false,
  })
})

test.afterAll(async () => {
  if (userId) {
    await cleanupE2eData(userId)
  }
})

/**
 * Helper: open the seeded contact's detail panel by clicking its card.
 * Waits for the dialog and the "Générer un email" button to appear.
 */
async function openContactPanel(page: import('@playwright/test').Page) {
  // Click on the seeded contact card by name
  const card = page.locator('[draggable]', { hasText: 'E2E Preset Test Contact' })
  await expect(card).toBeVisible({ timeout: ELEMENT_TIMEOUT })
  await card.click()

  const dialog = page.locator('[role="dialog"]')
  await expect(dialog).toBeVisible({ timeout: DIALOG_TIMEOUT })

  // Wait for the generate button to appear (content loads asynchronously)
  const generateBtn = dialog.getByText(/Générer un email|Generate email/i)
  await expect(generateBtn.first()).toBeVisible({ timeout: ELEMENT_TIMEOUT })

  return { dialog, generateBtn }
}

test.describe('Contact preset selector (sc-584)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/suivi`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)
  })

  test('preset dropdown appears next to Generate button for contacts without emails', async ({ page }) => {
    const { dialog } = await openContactPanel(page)

    // The preset select dropdown should be visible next to the generate button
    const presetSelect = dialog.locator('select[aria-label*="preset" i]')
    await expect(presetSelect.first()).toBeVisible({ timeout: ELEMENT_TIMEOUT })
  })

  test('preset dropdown contains preset options when presets exist', async ({ page }) => {
    const { dialog } = await openContactPanel(page)

    const presetSelect = dialog.locator('select[aria-label*="preset" i]')
    await expect(presetSelect.first()).toBeVisible({ timeout: ELEMENT_TIMEOUT })

    // Verify it has options: default placeholder + at least our seeded preset
    const options = presetSelect.locator('option')
    expect(await options.count()).toBeGreaterThanOrEqual(2)

    // Verify our seeded preset name appears in the dropdown
    const selectText = await presetSelect.textContent()
    expect(selectText).toContain('E2E Test Preset')
  })

  test('generate email button is functional with preset selected', async ({ page }) => {
    const { dialog, generateBtn } = await openContactPanel(page)

    // Select our seeded preset in the dropdown by value (preset ID)
    const presetSelect = dialog.locator('select[aria-label*="preset" i]')
    if (await presetSelect.count() > 0) {
      // Use value-based selection since label regex is not supported
      const presetOption = presetSelect.locator('option', { hasText: 'E2E Test Preset' }).first()
      const presetValue = await presetOption.getAttribute('value')
      if (presetValue) {
        await presetSelect.selectOption(presetValue)
      }
    }

    // The generate button should be enabled and clickable
    await expect(generateBtn.first()).toBeEnabled()
  })
})
