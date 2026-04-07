import { test, expect } from '@playwright/test'
import { getOrCreateTestUser } from '../fixtures/seed'

const PAGE_URL = '/recherche-offres'
const API_URL = 'http://localhost:3333'

let authToken: string

test.beforeAll(async () => {
  const auth = await getOrCreateTestUser()
  authToken = auth.token
})

test.describe('Job Search Config — /recherche-offres', () => {
  test.beforeEach(async () => {
    // Clean up any existing searches via API
    const res = await fetch(`${API_URL}/api/job-searches`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    if (res.ok) {
      const body = await res.json()
      for (const search of body.data ?? []) {
        await fetch(`${API_URL}/api/job-searches/${search.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        })
      }
    }
  })

  // --- Page rendering ---

  test('page renders with title and empty state', async ({ page }) => {
    await page.goto(PAGE_URL)
    await expect(page.getByTestId('job-search-config-page')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('job-search-page-title')).toBeVisible()
    // Empty state: form should be visible directly (no active search)
    await expect(page.getByTestId('job-search-config-form')).toBeVisible()
  })

  test('form renders all required fields', async ({ page }) => {
    await page.goto(PAGE_URL)
    await expect(page.getByTestId('job-search-config-form')).toBeVisible({ timeout: 10_000 })

    // Required fields
    await expect(page.getByTestId('job-search-roles-input')).toBeVisible()
    await expect(page.getByTestId('job-search-countries-select')).toBeVisible()
    await expect(page.getByTestId('job-search-platforms-input')).toBeVisible()
    await expect(page.getByTestId('job-search-seniority-input')).toBeVisible()

    // Optional fields
    await expect(page.getByTestId('job-search-cities-input')).toBeVisible()
    await expect(page.getByTestId('job-search-skills-input')).toBeVisible()
    await expect(page.getByTestId('job-search-frequency-select')).toBeVisible()

    // Submit button
    await expect(page.getByTestId('job-search-save-button')).toBeVisible()
  })

  test('platforms have individual checkboxes per wireframe', async ({ page }) => {
    await page.goto(PAGE_URL)
    await expect(page.getByTestId('job-search-config-form')).toBeVisible({ timeout: 10_000 })

    await expect(page.getByTestId('job-search-platforms-seek')).toBeVisible()
    await expect(page.getByTestId('job-search-platforms-linkedin')).toBeVisible()
    await expect(page.getByTestId('job-search-platforms-builtin')).toBeVisible()
    await expect(page.getByTestId('job-search-platforms-zeil')).toBeVisible()
  })

  test('seniority has radio buttons for each level', async ({ page }) => {
    await page.goto(PAGE_URL)
    await expect(page.getByTestId('job-search-config-form')).toBeVisible({ timeout: 10_000 })

    await expect(page.getByTestId('job-search-seniority-junior')).toBeVisible()
    await expect(page.getByTestId('job-search-seniority-intermediate')).toBeVisible()
    await expect(page.getByTestId('job-search-seniority-senior')).toBeVisible()
    await expect(page.getByTestId('job-search-seniority-lead')).toBeVisible()
    await expect(page.getByTestId('job-search-seniority-indifferent')).toBeVisible()
  })

  // --- Form validation ---

  test('shows error when submitting without roles', async ({ page }) => {
    await page.goto(PAGE_URL)
    await expect(page.getByTestId('job-search-config-form')).toBeVisible({ timeout: 10_000 })

    // Click submit without filling anything
    await page.getByTestId('job-search-save-button').click()

    // Error message should appear
    await expect(page.getByTestId('job-search-form-error')).toBeVisible()
  })

  // --- CRUD lifecycle ---

  test('create a search and see the active card', async ({ page }) => {
    await page.goto(PAGE_URL)
    await expect(page.getByTestId('job-search-config-form')).toBeVisible({ timeout: 10_000 })

    // Fill roles via TagInput
    const rolesInput = page.getByTestId('job-search-roles-input').locator('input')
    await rolesInput.fill('Senior Frontend')
    await rolesInput.press('Enter')

    // Select a country — custom CountrySelect dropdown with button items
    const countriesSelect = page.getByTestId('job-search-countries-select')
    const countryInput = countriesSelect.locator('input[type="text"]')
    await countryInput.click()
    // Type "NZ" to filter — works for both locales (matches country code)
    await countryInput.fill('NZ')
    await page.waitForTimeout(500)
    // Click the matching dropdown button
    const nzOption = countriesSelect.locator('button').filter({ hasText: /Zealand|Zélande/ }).first()
    await nzOption.click()
    // Close dropdown by clicking elsewhere
    await page.getByTestId('job-search-page-title').click()
    await page.waitForTimeout(300)

    // Check Seek platform
    await page.getByTestId('job-search-platforms-seek').locator('input[type="checkbox"]').check()

    // Select senior seniority
    await page.getByTestId('job-search-seniority-senior').locator('input[type="radio"]').check()

    // Submit
    await page.getByTestId('job-search-save-button').click()

    // Active card should appear
    await expect(page.getByTestId('job-search-active-card')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('job-search-roles')).toContainText('Senior Frontend')
  })

  test('active card shows edit, delete, and run buttons', async ({ page }) => {
    // Create a search via API
    await fetch(`${API_URL}/api/job-searches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roles: ['Fullstack Developer'],
        countries: ['NZ'],
        platforms: ['seek'],
        seniority: 'senior',
      }),
    })

    await page.goto(PAGE_URL)
    await expect(page.getByTestId('job-search-active-card')).toBeVisible({ timeout: 10_000 })

    // Wireframe buttons
    await expect(page.getByTestId('job-search-edit-btn')).toBeVisible()
    await expect(page.getByTestId('job-search-delete-btn')).toBeVisible()
    await expect(page.getByTestId('job-search-run-now-button')).toBeVisible()

    // Last run info
    await expect(page.getByTestId('job-search-last-run')).toBeVisible()
  })

  test('edit button opens pre-filled form', async ({ page }) => {
    // Create a search via API
    await fetch(`${API_URL}/api/job-searches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roles: ['React Developer'],
        countries: ['AU'],
        platforms: ['linkedin'],
        seniority: 'lead',
      }),
    })

    await page.goto(PAGE_URL)
    await expect(page.getByTestId('job-search-active-card')).toBeVisible({ timeout: 10_000 })

    // Click edit
    await page.getByTestId('job-search-edit-btn').click()

    // Form should appear with cancel button
    await expect(page.getByTestId('job-search-config-form')).toBeVisible()
    await expect(page.getByTestId('job-search-cancel-btn')).toBeVisible()
  })

  test('delete removes the search and shows empty state', async ({ page }) => {
    // Create a search via API
    await fetch(`${API_URL}/api/job-searches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roles: ['DevOps Engineer'],
        countries: ['NZ'],
        platforms: ['seek'],
        seniority: 'indifferent',
      }),
    })

    await page.goto(PAGE_URL)
    await expect(page.getByTestId('job-search-active-card')).toBeVisible({ timeout: 10_000 })

    // Delete
    await page.getByTestId('job-search-delete-btn').click()

    // Card should disappear, form should reappear (empty state)
    await expect(page.getByTestId('job-search-active-card')).not.toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId('job-search-config-form')).toBeVisible()
  })

  test('run now triggers a search run', async ({ page }) => {
    // Create a search via API
    await fetch(`${API_URL}/api/job-searches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roles: ['Backend Developer'],
        countries: ['NZ'],
        platforms: ['seek'],
        seniority: 'senior',
      }),
    })

    await page.goto(PAGE_URL)
    await expect(page.getByTestId('job-search-active-card')).toBeVisible({ timeout: 10_000 })

    // Click run
    await page.getByTestId('job-search-run-now-button').click()

    // Last run should update (no longer "never run")
    await expect(page.getByTestId('job-search-last-run')).not.toContainText(/jamais|never/i, { timeout: 5_000 })
  })

  // --- Navigation ---

  test('sidebar has job search navigation link', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('Tableau de bord', { timeout: 10_000 })

    // Sidebar should contain a link to /recherche-offres
    const sidebarLink = page.locator('nav a[href="/recherche-offres"]')
    await expect(sidebarLink).toBeVisible()
  })
})
