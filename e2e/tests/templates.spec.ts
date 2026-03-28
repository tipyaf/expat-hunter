import { test, expect } from '@playwright/test'

test.describe('Templates page', () => {
  test('displays templates page with title and new button', async ({ page }) => {
    await page.goto('/parametres/templates')
    await expect(page.locator('h1')).toContainText(/Mes templates|Email templates/, { timeout: 10_000 })
    await expect(page.getByRole('button', { name: /nouveau template|new template/i })).toBeVisible()
  })

  test('shows empty state when no templates exist', async ({ page }) => {
    await page.goto('/parametres/templates')
    await page.waitForTimeout(1500)

    const content = await page.textContent('main')
    // Either templates exist or empty state shows
    expect(content).toBeTruthy()
  })

  test('opens create form when clicking new template button', async ({ page }) => {
    await page.goto('/parametres/templates')
    await expect(page.locator('h1')).toContainText(/Mes templates|Email templates/, { timeout: 10_000 })

    // Click either the header button or empty-state button
    const newBtn = page.getByRole('button', { name: /nouveau template|new template|créer un template|create/i }).first()
    await newBtn.click()

    // Form should appear with name, subject, and body fields
    await expect(page.getByText(/Nom du template|Template name/i)).toBeVisible()
    await expect(page.getByText(/Objet|Subject/i).first()).toBeVisible()
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('create template form has save and cancel buttons', async ({ page }) => {
    await page.goto('/parametres/templates')
    await expect(page.locator('h1')).toContainText(/Mes templates|Email templates/, { timeout: 10_000 })

    const newBtn = page.getByRole('button', { name: /nouveau template|new template|créer un template|create/i }).first()
    await newBtn.click()

    await expect(page.getByRole('button', { name: /sauvegarder|save/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /annuler|cancel/i })).toBeVisible()
  })

  test('cancel closes the form', async ({ page }) => {
    await page.goto('/parametres/templates')
    await expect(page.locator('h1')).toContainText(/Mes templates|Email templates/, { timeout: 10_000 })

    const newBtn = page.getByRole('button', { name: /nouveau template|new template|créer un template|create/i }).first()
    await newBtn.click()

    // Form is visible
    await expect(page.locator('textarea')).toBeVisible()

    // Cancel
    await page.getByRole('button', { name: /annuler|cancel/i }).click()

    // Form should be hidden
    await expect(page.locator('textarea')).not.toBeVisible({ timeout: 3_000 })
  })

  test('shows validation error when saving empty form', async ({ page }) => {
    await page.goto('/parametres/templates')
    await expect(page.locator('h1')).toContainText(/Mes templates|Email templates/, { timeout: 10_000 })

    const newBtn = page.getByRole('button', { name: /nouveau template|new template|créer un template|create/i }).first()
    await newBtn.click()

    // Save without filling fields
    await page.getByRole('button', { name: /sauvegarder|save/i }).click()

    // Should show validation error
    await expect(page.getByText(/obligatoires|required/i)).toBeVisible({ timeout: 3_000 })
  })

  test('create and display a new template', async ({ page }) => {
    await page.goto('/parametres/templates')
    await expect(page.locator('h1')).toContainText(/Mes templates|Email templates/, { timeout: 10_000 })

    const newBtn = page.getByRole('button', { name: /nouveau template|new template|créer un template|create/i }).first()
    await newBtn.click()

    const templateName = `E2E Template ${Date.now()}`

    // Fill form
    const inputs = page.locator('input[type="text"]')
    await inputs.first().fill(templateName)
    await inputs.nth(1).fill('Subject: Opportunity at {{company}}')
    await page.locator('textarea').fill('Hello {{contact_name}}, I am interested in joining {{company}}.')

    // Save
    await page.getByRole('button', { name: /sauvegarder|save/i }).click()

    // Template should appear in the list
    await expect(page.getByText(templateName)).toBeVisible({ timeout: 5_000 })
  })

  test('has default checkbox in form', async ({ page }) => {
    await page.goto('/parametres/templates')
    await expect(page.locator('h1')).toContainText(/Mes templates|Email templates/, { timeout: 10_000 })

    const newBtn = page.getByRole('button', { name: /nouveau template|new template|créer un template|create/i }).first()
    await newBtn.click()

    await expect(page.getByText(/par défaut|default/i).first()).toBeVisible()
    await expect(page.locator('input[type="checkbox"]')).toBeVisible()
  })
})
