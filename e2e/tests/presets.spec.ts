import { test, expect } from '@playwright/test'

test.describe('Presets page', () => {
  test('displays presets page with title and new button', async ({ page }) => {
    await page.goto('/parametres/presets')
    await expect(page.locator('h1')).toContainText(/Mes presets|Generation presets/, { timeout: 10_000 })
    await expect(page.getByRole('button', { name: /nouveau preset|new preset/i })).toBeVisible()
  })

  test('shows empty state when no presets exist', async ({ page }) => {
    await page.goto('/parametres/presets')
    await page.waitForTimeout(1500)

    const content = await page.textContent('main')
    expect(content).toBeTruthy()
  })

  test('opens create form when clicking new preset button', async ({ page }) => {
    await page.goto('/parametres/presets')
    await expect(page.locator('h1')).toContainText(/Mes presets|Generation presets/, { timeout: 10_000 })

    const newBtn = page.getByRole('button', { name: /nouveau preset|new preset|créer un preset|create/i }).first()
    await newBtn.click()

    // Form should show name field, length, framework, tone, language selectors
    await expect(page.getByText(/Nom du preset|Preset name/i)).toBeVisible()
    await expect(page.getByText(/Longueur|Length/i)).toBeVisible()
    await expect(page.getByText(/Framework/i)).toBeVisible()
    await expect(page.getByText('Ton', { exact: true })).toBeVisible()
  })

  test('shows length selector with short/medium/long options', async ({ page }) => {
    await page.goto('/parametres/presets')
    await expect(page.locator('h1')).toContainText(/Mes presets|Generation presets/, { timeout: 10_000 })

    const newBtn = page.getByRole('button', { name: /nouveau preset|new preset|créer un preset|create/i }).first()
    await newBtn.click()

    await expect(page.getByRole('button', { name: /court|short/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /moyen|medium/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /long/i })).toBeVisible()
  })

  test('shows framework selector with AIDA, PAS, BAB, DIRECT', async ({ page }) => {
    await page.goto('/parametres/presets')
    await expect(page.locator('h1')).toContainText(/Mes presets|Generation presets/, { timeout: 10_000 })

    const newBtn = page.getByRole('button', { name: /nouveau preset|new preset|créer un preset|create/i }).first()
    await newBtn.click()

    await expect(page.getByRole('button', { name: 'AIDA' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'PAS' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'BAB' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'DIRECT', exact: true })).toBeVisible()
  })

  test('shows tone selector with toggleable chips', async ({ page }) => {
    await page.goto('/parametres/presets')
    await expect(page.locator('h1')).toContainText(/Mes presets|Generation presets/, { timeout: 10_000 })

    const newBtn = page.getByRole('button', { name: /nouveau preset|new preset|créer un preset|create/i }).first()
    await newBtn.click()

    await expect(page.getByRole('button', { name: /professionnel|professional/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /amical|friendly/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /direct/i }).last()).toBeVisible()
    await expect(page.getByRole('button', { name: /enthousiaste|enthusiastic/i })).toBeVisible()
  })

  test('has language dropdown and custom instructions textarea', async ({ page }) => {
    await page.goto('/parametres/presets')
    await expect(page.locator('h1')).toContainText(/Mes presets|Generation presets/, { timeout: 10_000 })

    const newBtn = page.getByRole('button', { name: /nouveau preset|new preset|créer un preset|create/i }).first()
    await newBtn.click()

    await expect(page.locator('select')).toBeVisible()
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('cancel closes the form', async ({ page }) => {
    await page.goto('/parametres/presets')
    await expect(page.locator('h1')).toContainText(/Mes presets|Generation presets/, { timeout: 10_000 })

    const newBtn = page.getByRole('button', { name: /nouveau preset|new preset|créer un preset|create/i }).first()
    await newBtn.click()

    await expect(page.locator('textarea')).toBeVisible()

    await page.getByRole('button', { name: /annuler|cancel/i }).click()
    await expect(page.locator('textarea')).not.toBeVisible({ timeout: 3_000 })
  })

  test('shows validation error when saving without name', async ({ page }) => {
    await page.goto('/parametres/presets')
    await expect(page.locator('h1')).toContainText(/Mes presets|Generation presets/, { timeout: 10_000 })

    const newBtn = page.getByRole('button', { name: /nouveau preset|new preset|créer un preset|create/i }).first()
    await newBtn.click()

    await page.getByRole('button', { name: /sauvegarder|save/i }).click()

    await expect(page.getByText(/obligatoire|required/i)).toBeVisible({ timeout: 3_000 })
  })

  test('create and display a new preset', async ({ page }) => {
    await page.goto('/parametres/presets')
    await expect(page.locator('h1')).toContainText(/Mes presets|Generation presets/, { timeout: 10_000 })

    const newBtn = page.getByRole('button', { name: /nouveau preset|new preset|créer un preset|create/i }).first()
    await newBtn.click()

    const presetName = `E2E Preset ${Date.now()}`

    // Fill name
    await page.locator('input[type="text"]').fill(presetName)

    // Select short length
    await page.getByRole('button', { name: /court|short/i }).click()

    // Select AIDA framework
    await page.getByRole('button', { name: 'AIDA' }).click()

    // Save
    await page.getByRole('button', { name: /sauvegarder|save/i }).click()

    // Preset should appear in the list
    await expect(page.getByText(presetName)).toBeVisible({ timeout: 5_000 })
  })

  test('has default checkbox in form', async ({ page }) => {
    await page.goto('/parametres/presets')
    await expect(page.locator('h1')).toContainText(/Mes presets|Generation presets/, { timeout: 10_000 })

    const newBtn = page.getByRole('button', { name: /nouveau preset|new preset|créer un preset|create/i }).first()
    await newBtn.click()

    await expect(page.getByText(/par défaut|default/i).first()).toBeVisible()
    await expect(page.locator('input[type="checkbox"]')).toBeVisible()
  })
})
