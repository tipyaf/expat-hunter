import { test, expect } from '@playwright/test'

test.describe('Settings page', () => {
  test('displays settings page with sections', async ({ page }) => {
    await page.goto('http://localhost:3000/parametres')
    await expect(page.locator('h1')).toContainText(/Paramètres|Settings/, { timeout: 10_000 })
  })

  test('shows account section with email', async ({ page }) => {
    await page.goto('http://localhost:3000/parametres')
    await expect(page.locator('h1')).toContainText(/Paramètres|Settings/, { timeout: 10_000 })
    await expect(page.getByText(/Compte|Account/)).toBeVisible()
  })

  test('shows follow-up sequence configuration', async ({ page }) => {
    await page.goto('http://localhost:3000/parametres')
    await expect(page.locator('h1')).toContainText(/Paramètres|Settings/, { timeout: 10_000 })
    await expect(page.getByText(/Séquences de relance|Follow-up sequences/)).toBeVisible()
  })

  test('shows language selector', async ({ page }) => {
    await page.goto('http://localhost:3000/parametres')
    await expect(page.locator('h1')).toContainText(/Paramètres|Settings/, { timeout: 10_000 })
    await expect(page.getByText(/Langue|Language/)).toBeVisible()
    await expect(page.locator('select')).toBeVisible()
  })

  test('has save button', async ({ page }) => {
    await page.goto('http://localhost:3000/parametres')
    await expect(page.locator('h1')).toContainText(/Paramètres|Settings/, { timeout: 10_000 })
    await expect(page.getByRole('button', { name: /Sauvegarder|Save/ })).toBeVisible()
  })
})
