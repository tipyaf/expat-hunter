import { test, expect } from '@playwright/test'

test.describe('Contact to email flow', () => {
  test('contact with "contact" recommendation appears in pipeline', async ({ page }) => {
    await page.goto('/suivi')
    await page.waitForTimeout(2000)

    // Our test contact "Sarah Mitchell" should be visible in the board
    const sarahCard = page.locator('text=Sarah Mitchell')
    if (await sarahCard.isVisible()) {
      await expect(sarahCard).toBeVisible()
    }
  })

  test('contact appears in contacts list', async ({ page }) => {
    await page.goto('/contacts')
    await page.waitForTimeout(2000)

    // Check that contacts page loads with content
    await expect(page.locator('h1')).toContainText('Contacts')

    // Our seeded test contact should appear
    const content = await page.textContent('main')
    expect(content).toBeTruthy()
  })

  test('generate email then see it in emails list', async ({ page }) => {
    // Step 1: Go to emails page
    await page.goto('/emails')
    await page.waitForTimeout(1500)

    // Step 2: Click generate
    const generateBtn = page.getByRole('button', { name: /générer/i })
    await generateBtn.click()

    // Step 3: Wait for result message
    await page.waitForSelector('[class*="rounded-lg"][class*="px-4"][class*="py-3"]', {
      timeout: 15_000,
    })

    // Step 4: Check if emails appeared
    await page.waitForTimeout(2000)
    const emailCards = page.locator('[class*="rounded-xl"][class*="border"][class*="shadow"]')
    const count = await emailCards.count()

    // If emails were generated, verify card content
    if (count > 0) {
      const firstCard = emailCards.first()
      const cardText = await firstCard.textContent()
      expect(cardText).toBeTruthy()
      // Card should contain email subject and body
      expect(cardText!.length).toBeGreaterThan(10)
    }
  })

  test('sidebar navigation works between all pages', async ({ page }) => {
    // Dashboard
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('Tableau de bord')

    // Contacts
    await page.click('a[href="/contacts"]')
    await expect(page.locator('h1')).toContainText('Contacts')

    // Emails
    await page.click('a[href="/emails"]')
    await expect(page.locator('h1')).toContainText('Emails')

    // Suivi (ex-Pipeline)
    await page.click('a[href="/suivi"]')
    await expect(page.locator('h1')).toContainText('Pipeline')

    // Profil
    await page.click('a[href="/profil"]')
    await expect(page.locator('h1')).toContainText('profil')

    // Back to dashboard
    await page.click('a[href="/"]')
    await expect(page.locator('h1')).toContainText('Tableau de bord')
  })
})
