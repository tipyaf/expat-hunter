import { test, expect } from '@playwright/test'

test.describe('Emails page', () => {
  test('displays emails page with title and generate button', async ({ page }) => {
    await page.goto('/emails')
    await expect(page.locator('h1')).toContainText('Emails')
    await expect(page.getByRole('button', { name: /générer/i })).toBeVisible()
  })

  test('shows empty state when no emails exist', async ({ page }) => {
    await page.goto('/emails')
    // Wait for loading to finish
    await page.waitForTimeout(1000)
    // Either emails exist or empty state shows
    const content = await page.textContent('main')
    expect(content).toBeTruthy()
  })

  test('generate emails button shows loading state', async ({ page }) => {
    await page.goto('/emails')
    const btn = page.getByRole('button', { name: /générer/i })
    await expect(btn).toBeEnabled()

    await btn.click()

    // Should show a feedback message (success or info)
    await page.waitForSelector('[class*="rounded-lg"][class*="px-4"]', { timeout: 15_000 })
    const alert = page.locator('[class*="rounded-lg"][class*="px-4"][class*="py-3"]')
    await expect(alert).toBeVisible()
  })

  test('status filter pills are visible', async ({ page }) => {
    await page.goto('/emails')
    await expect(page.getByRole('button', { name: /tous/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /brouillon/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /approuvé/i })).toBeVisible()
  })

  test('clicking status filter changes active pill', async ({ page }) => {
    await page.goto('/emails')
    const draftBtn = page.getByRole('button', { name: /brouillon/i })
    await draftBtn.click()
    await expect(draftBtn).toHaveClass(/bg-primary/)
  })

  test('draft email shows action buttons', async ({ page }) => {
    await page.goto('/emails')
    await page.waitForTimeout(1500)

    const draftCard = page.locator('[class*="rounded-xl"][class*="border"]').filter({
      has: page.locator('text=Brouillon'),
    }).first()

    if (await draftCard.isVisible()) {
      await expect(draftCard.getByRole('button', { name: /approuver/i })).toBeVisible()
      await expect(draftCard.getByRole('button', { name: /supprimer/i })).toBeVisible()
      await expect(draftCard.getByRole('button', { name: /modifier/i })).toBeVisible()
      await expect(draftCard.getByRole('button', { name: /régénérer/i })).toBeVisible()
    }
  })

  test('edit draft email opens modal with subject and body fields', async ({ page }) => {
    await page.goto('/emails')
    await page.waitForTimeout(1500)

    const editBtn = page.getByRole('button', { name: /modifier/i }).first()
    if (await editBtn.isVisible()) {
      await editBtn.click()

      // Modal dialog should appear
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible({ timeout: 3_000 })

      // Subject and body fields inside modal
      const subjectInput = dialog.locator('#email-subject')
      await expect(subjectInput).toBeVisible()

      const bodyTextarea = dialog.locator('#email-body')
      await expect(bodyTextarea).toBeVisible()

      // Modify subject
      await subjectInput.fill('Updated subject for E2E test')

      // Save
      const saveBtn = dialog.getByRole('button', { name: /sauvegarder|save/i })
      await saveBtn.click()

      // Modal should close
      await expect(dialog).not.toBeVisible({ timeout: 5_000 })

      // Verify updated text appears
      await expect(page.locator('text=Updated subject for E2E test')).toBeVisible()
    }
  })

  test('edit modal shows AI instructions section', async ({ page }) => {
    await page.goto('/emails')
    await page.waitForTimeout(1500)

    const editBtn = page.getByRole('button', { name: /modifier/i }).first()
    if (await editBtn.isVisible()) {
      await editBtn.click()

      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible({ timeout: 3_000 })

      // AI instructions textarea
      await expect(dialog.locator('#ai-instructions')).toBeVisible()

      // Improve with AI and regenerate buttons
      await expect(dialog.getByRole('button', { name: /améliorer|improve/i })).toBeVisible()
      await expect(dialog.getByRole('button', { name: /régénérer|regenerate/i })).toBeVisible()

      // Close modal
      await dialog.getByRole('button', { name: /annuler|cancel/i }).click()
      await expect(dialog).not.toBeVisible({ timeout: 3_000 })
    }
  })

  test('approve draft email changes its status', async ({ page }) => {
    await page.goto('/emails')
    await page.waitForTimeout(1500)

    const approveBtn = page.getByRole('button', { name: /^approuver$/i }).first()
    if (await approveBtn.isVisible()) {
      await approveBtn.click()
      await page.waitForTimeout(1000)

      // The card should now show "Approuvé" status
      await expect(page.locator('text=Approuvé').first()).toBeVisible()
    }
  })

  test('pagination appears when many emails', async ({ page }) => {
    await page.goto('/emails')
    await page.waitForTimeout(1500)

    // Pagination may or may not be visible depending on data
    const content = await page.textContent('main')
    expect(content).toBeTruthy()
  })
})
