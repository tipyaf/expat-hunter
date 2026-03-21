import { test, expect } from '@playwright/test'

test.describe('Dashboard page', () => {
  test('displays dashboard with welcome message and stats', async ({ page }) => {
    await page.goto('http://localhost:3000/')
    await expect(page.locator('h1')).toContainText('Tableau de bord', { timeout: 10_000 })
    // Quick stats section should be visible
    await expect(page.getByText(/Statistiques rapides|Quick stats/)).toBeVisible()
  })

  test('shows pending actions section', async ({ page }) => {
    await page.goto('http://localhost:3000/')
    await expect(page.locator('h1')).toContainText('Tableau de bord', { timeout: 10_000 })
    await expect(page.getByText(/Actions en attente|Pending actions/)).toBeVisible()
  })

  test('shows stats cards with numbers', async ({ page }) => {
    await page.goto('http://localhost:3000/')
    await expect(page.locator('h1')).toContainText('Tableau de bord', { timeout: 10_000 })
    // Stats section should show 3 stat cards
    const statsSection = page.locator('main')
    await expect(statsSection.getByRole('heading', { name: /Contacts/ })).toBeVisible()
    await expect(statsSection.getByRole('heading', { name: /Emails envoyés|Emails sent/ })).toBeVisible()
    await expect(statsSection.getByRole('heading', { name: /Réponses reçues|Replies received/ })).toBeVisible()
  })
})
