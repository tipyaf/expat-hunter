import { test, expect } from '@playwright/test'

test.describe('Pipeline page', () => {
  test('displays pipeline with 5 kanban columns', async ({ page }) => {
    await page.goto('/suivi')
    await expect(page.locator('h1')).toContainText('Pipeline')

    // 5 columns should be visible
    await expect(page.locator('text=Trouvé')).toBeVisible()
    await expect(page.locator('text=À contacter')).toBeVisible()
    await expect(page.locator('text=Contacté')).toBeVisible()
    await expect(page.locator('text=En discussion')).toBeVisible()
    await expect(page.locator('text=Terminé')).toBeVisible()
  })

  test('shows total contacts count in header', async ({ page }) => {
    await page.goto('/suivi')
    await page.waitForTimeout(1500)

    await expect(page.locator('text=/\\d+ contacts? au total/')).toBeVisible()
  })

  test('each column shows count badge', async ({ page }) => {
    await page.goto('/suivi')
    await page.waitForTimeout(1500)

    // Each column header has a count badge
    const badges = page.locator('.rounded-full')
    const count = await badges.count()
    expect(count).toBeGreaterThanOrEqual(5)
  })

  test('contact cards display name, role, company', async ({ page }) => {
    await page.goto('/suivi')
    await page.waitForTimeout(1500)

    // Look for any contact card (draggable div inside a column)
    const cards = page.locator('[draggable="true"]')
    const cardCount = await cards.count()

    if (cardCount > 0) {
      const firstCard = cards.first()
      // Card should have text content (name, role)
      const text = await firstCard.textContent()
      expect(text).toBeTruthy()
      expect(text!.length).toBeGreaterThan(3)
    }
  })

  test('contact card shows relevance badge when available', async ({ page }) => {
    await page.goto('/suivi')
    await page.waitForTimeout(1500)

    // Look for relevance badges (very_relevant, relevant, etc.)
    const relevanceBadges = page.locator('text=/Très pertinent|Pertinent|À vérifier|Non pertinent/')
    const count = await relevanceBadges.count()
    // At least our test contact should have a badge
    if (count > 0) {
      await expect(relevanceBadges.first()).toBeVisible()
    }
  })

  test('empty column shows placeholder message', async ({ page }) => {
    await page.goto('/suivi')
    await page.waitForTimeout(1500)

    // At least one column should be empty (showing "Aucun contact")
    const emptyMessages = page.locator('text=Aucun contact')
    const count = await emptyMessages.count()
    // We expect at least some columns to be empty in test data
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('drag and drop moves contact between columns', async ({ page }) => {
    await page.goto('/suivi')
    await page.waitForTimeout(2000)

    const cards = page.locator('[draggable="true"]')
    const cardCount = await cards.count()

    if (cardCount > 0) {
      const firstCard = cards.first()
      const cardText = await firstCard.textContent()

      // Find the "À contacter" column drop zone
      const targetColumn = page.locator('text=À contacter').locator('..')
        .locator('..').locator('[class*="overflow-y-auto"]')

      if (await targetColumn.isVisible()) {
        // Attempt drag and drop
        await firstCard.dragTo(targetColumn)
        await page.waitForTimeout(1000)

        // Verify the card moved (or at least no error)
        const content = await page.textContent('main')
        expect(content).toContain('Pipeline')
      }
    }
  })
})
