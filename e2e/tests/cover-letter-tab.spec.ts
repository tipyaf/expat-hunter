import { test, expect } from '@playwright/test'
import { getOrCreateTestUser } from '../fixtures/seed'

const API_URL = 'http://localhost:3333'

let authToken: string
let testOfferId: string

test.beforeAll(async () => {
  const auth = await getOrCreateTestUser()
  authToken = auth.token

  // Ensure a job search exists for the test user
  const searchesRes = await fetch(`${API_URL}/api/job-searches`, {
    headers: { Authorization: `Bearer ${authToken}` },
  })
  const searchesBody = await searchesRes.json()

  if (searchesBody.data?.length === 0) {
    await fetch(`${API_URL}/api/job-searches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        roles: ['Senior Frontend Engineer'],
        countries: ['NZ'],
        platforms: ['seek'],
        seniority: 'senior',
      }),
    })
  }

  // Ensure at least one job offer exists
  const offersRes = await fetch(`${API_URL}/api/job-offers`, {
    headers: { Authorization: `Bearer ${authToken}` },
  })
  const offersBody = await offersRes.json()

  if (offersBody.data?.length > 0) {
    testOfferId = offersBody.data[0].id
  } else {
    testOfferId = ''
  }
})

test.describe('Cover Letter tab — /offres/:id', () => {
  test.skip(() => !testOfferId, 'No job offer available for testing')

  test('detail page shows 4 tabs including Cover Letter', async ({ page }) => {
    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByTestId('detail-tabs')).toBeVisible({ timeout: 10_000 })

    await expect(page.getByTestId('tab-details')).toBeVisible()
    await expect(page.getByTestId('tab-cv')).toBeVisible()
    await expect(page.getByTestId('tab-cover-letter')).toBeVisible()
    await expect(page.getByTestId('tab-send')).toBeVisible()
  })

  test('clicking Cover Letter tab shows cover letter content', async ({ page }) => {
    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByTestId('tab-cover-letter')).toBeVisible({ timeout: 10_000 })

    await page.getByTestId('tab-cover-letter').click()

    // Should show either: generate button (no cover letter yet), text display (already generated), or loading
    const generateBtn = page.getByTestId('generate-cl-btn')
    const textDisplay = page.getByTestId('cl-text-display')
    const loading = page.getByTestId('cl-tab-loading')

    await expect(
      generateBtn.or(textDisplay).or(loading)
    ).toBeVisible({ timeout: 10_000 })
  })

  test('cover letter tab shows generate button when no cover letter exists', async ({ page }) => {
    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByTestId('tab-cover-letter')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('tab-cover-letter').click()

    // Wait for loading to finish
    await page.getByTestId('cl-tab-loading').waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})

    const generateBtn = page.getByTestId('generate-cl-btn')
    const textDisplay = page.getByTestId('cl-text-display')

    // If no cover letter was generated yet, we should see the generate button
    if (await generateBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(generateBtn).toBeEnabled()
    } else {
      // Cover letter already exists — text display should be visible
      await expect(textDisplay).toBeVisible()
    }
  })

  test('cover letter tab shows edit and download buttons when cover letter exists', async ({ page }) => {
    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByTestId('tab-cover-letter')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('tab-cover-letter').click()

    await page.getByTestId('cl-tab-loading').waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})

    const textDisplay = page.getByTestId('cl-text-display')

    if (await textDisplay.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Edit button and PDF download button should be visible
      await expect(page.getByTestId('cl-edit-btn')).toBeVisible()
      await expect(page.getByTestId('cl-download-pdf-btn')).toBeVisible()

      // Refine form should also be visible
      await expect(page.getByTestId('cl-refine-form')).toBeVisible()
      await expect(page.getByTestId('cl-refine-instruction-input')).toBeVisible()

      // Refine button should be disabled (empty instruction)
      await expect(page.getByTestId('cl-refine-btn')).toBeDisabled()
    }
  })

  test('edit mode opens textarea with cover letter content', async ({ page }) => {
    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByTestId('tab-cover-letter')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('tab-cover-letter').click()

    await page.getByTestId('cl-tab-loading').waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})

    const editBtn = page.getByTestId('cl-edit-btn')

    if (await editBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await editBtn.click()

      // Edit mode should be visible with textarea
      await expect(page.getByTestId('cl-edit-mode')).toBeVisible()
      await expect(page.getByTestId('cl-edit-textarea')).toBeVisible()

      // Textarea should have content
      const textareaValue = await page.getByTestId('cl-edit-textarea').inputValue()
      expect(textareaValue.length).toBeGreaterThan(0)

      // Save and cancel buttons should be visible
      await expect(page.getByTestId('cl-edit-save-btn')).toBeVisible()
      await expect(page.getByTestId('cl-edit-cancel-btn')).toBeVisible()

      // Cancel returns to text display
      await page.getByTestId('cl-edit-cancel-btn').click()
      await expect(page.getByTestId('cl-text-display')).toBeVisible()
    }
  })

  test('refine button enables when instruction is typed', async ({ page }) => {
    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByTestId('tab-cover-letter')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('tab-cover-letter').click()

    await page.getByTestId('cl-tab-loading').waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})

    const refineInput = page.getByTestId('cl-refine-instruction-input')

    if (await refineInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Initially disabled
      await expect(page.getByTestId('cl-refine-btn')).toBeDisabled()

      // Type instruction
      await refineInput.fill('Make the tone more formal')

      // Now enabled
      await expect(page.getByTestId('cl-refine-btn')).toBeEnabled()
    }
  })

  test('no hardcoded Tailwind color classes in cover letter tab', async ({ page }) => {
    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByTestId('tab-cover-letter')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('tab-cover-letter').click()

    await page.getByTestId('cl-tab-loading').waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})

    // Get the cover letter tab container HTML
    const clTab = page.getByTestId('cl-tab')
    if (await clTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const html = await clTab.innerHTML()
      // No hardcoded Tailwind color classes
      expect(html).not.toMatch(/text-blue-|text-red-|text-green-|bg-blue-|bg-red-|bg-green-|text-gray-|bg-gray-/)
    }
  })
})
