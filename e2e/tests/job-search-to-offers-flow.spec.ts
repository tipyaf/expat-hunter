/**
 * E2E: Create search → Run → View offers flow
 *
 * Tests the critical user path:
 * 1. Create a job search on /recherche-offres
 * 2. Run the search (triggers scraping)
 * 3. Navigate to /offres and verify the search appears in the dropdown
 * 4. Verify the search card remains visible after run (bug fix validation)
 */
import { test, expect } from '@playwright/test'
import { getOrCreateTestUser } from '../fixtures/seed'

const SEARCH_PAGE = '/recherche-offres'
const OFFERS_PAGE = '/offres'
const API_URL = 'http://localhost:3333'

let authToken: string

test.beforeAll(async () => {
  const auth = await getOrCreateTestUser()
  authToken = auth.token
})

test.describe('Job Search → Offers Flow', () => {
  test.beforeEach(async () => {
    // Clean up existing searches and their offers via API
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

  test('search card remains visible after run (no disappear bug)', async ({ page }) => {
    // Create a search via API
    const createRes = await fetch(`${API_URL}/api/job-searches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roles: ['Frontend developer'],
        countries: ['NZ'],
        platforms: ['seek'],
        seniority: 'senior',
      }),
    })
    expect(createRes.ok).toBe(true)

    await page.goto(SEARCH_PAGE)
    await expect(page.getByTestId('job-search-active-card')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('job-search-roles')).toContainText('Frontend developer')

    // Click "Run now"
    await page.getByTestId('job-search-run-now-button').click()

    // Card MUST remain visible after run (this was the disappear bug)
    await expect(page.getByTestId('job-search-active-card')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('job-search-roles')).toContainText('Frontend developer')

    // Last run should update
    await expect(page.getByTestId('job-search-last-run')).not.toContainText(/jamais|never/i, { timeout: 10_000 })
  })

  test('run endpoint returns updated JobSearch with lastRunAt', async () => {
    // Create a search via API
    const createRes = await fetch(`${API_URL}/api/job-searches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roles: ['Backend developer'],
        countries: ['NZ'],
        platforms: ['seek'],
        seniority: 'senior',
      }),
    })
    const { data: search } = await createRes.json()

    // Run the search
    const runRes = await fetch(`${API_URL}/api/job-searches/${search.id}/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    })
    expect(runRes.ok).toBe(true)

    const body = await runRes.json()

    // Must return a proper JobSearch object in data (not ScrapingResult)
    expect(body.data).toHaveProperty('id', search.id)
    expect(body.data).toHaveProperty('roles')
    expect(body.data).toHaveProperty('lastRunAt')
    expect(body.data.lastRunAt).not.toBeNull()

    // Must also return scraping stats
    expect(body.scraping).toHaveProperty('totalScraped')
    expect(body.scraping).toHaveProperty('newOffers')
    expect(body.scraping).toHaveProperty('duplicates')
  })

  test('offers page dropdown lists user searches', async ({ page }) => {
    // Create a search via API
    await fetch(`${API_URL}/api/job-searches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roles: ['Data Engineer'],
        countries: ['AU'],
        platforms: ['linkedin'],
        seniority: 'intermediate',
      }),
    })

    await page.goto(OFFERS_PAGE)
    await expect(page.getByTestId('job-offers-search-filter')).toBeVisible({ timeout: 10_000 })

    // Dropdown should have "All searches" + the created search
    const select = page.getByTestId('job-offers-search-filter')
    const options = select.locator('option')
    await expect(options).toHaveCount(2, { timeout: 5_000 })

    // Second option should contain the role and country
    await expect(options.nth(1)).toContainText('Data Engineer')
    await expect(options.nth(1)).toContainText('AU')
  })

  test('full flow: create → run → navigate to offers', async ({ page }) => {
    // Step 1: Go to search config page
    await page.goto(SEARCH_PAGE)
    await expect(page.getByTestId('job-search-config-form')).toBeVisible({ timeout: 10_000 })

    // Step 2: Fill and submit the form
    const rolesInput = page.getByTestId('job-search-roles-input').locator('input')
    await rolesInput.fill('QA Engineer')
    await rolesInput.press('Enter')

    const countriesSelect = page.getByTestId('job-search-countries-select')
    const countryInput = countriesSelect.locator('input[type="text"]')
    await countryInput.click()
    await countryInput.fill('NZ')
    await page.waitForTimeout(500)
    const nzOption = countriesSelect.locator('button').filter({ hasText: /Zealand|Zélande/ }).first()
    await nzOption.click()
    await page.getByTestId('job-search-page-title').click()
    await page.waitForTimeout(300)

    await page.getByTestId('job-search-platforms-seek').locator('input[type="checkbox"]').check()
    await page.getByTestId('job-search-seniority-senior').locator('input[type="radio"]').check()

    await page.getByTestId('job-search-save-button').click()

    // Step 3: Active card appears
    await expect(page.getByTestId('job-search-active-card')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('job-search-roles')).toContainText('QA Engineer')

    // Step 4: Run the search
    await page.getByTestId('job-search-run-now-button').click()

    // Card stays visible (bug fix regression test)
    await expect(page.getByTestId('job-search-active-card')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('job-search-last-run')).not.toContainText(/jamais|never/i, { timeout: 10_000 })

    // Step 5: Navigate to offers page
    await page.goto(OFFERS_PAGE)
    await expect(page.getByTestId('job-offers-search-filter')).toBeVisible({ timeout: 10_000 })

    // Dropdown should list the search we just created
    const select = page.getByTestId('job-offers-search-filter')
    const options = select.locator('option')
    await expect(options).toHaveCount(2, { timeout: 5_000 })
    await expect(options.nth(1)).toContainText('QA Engineer')
  })

  test('offers page shows empty state when no offers exist', async ({ page }) => {
    // Create a search (but don't run — no offers)
    await fetch(`${API_URL}/api/job-searches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roles: ['DevOps'],
        countries: ['NZ'],
        platforms: ['seek'],
        seniority: 'indifferent',
      }),
    })

    await page.goto(OFFERS_PAGE)
    await expect(page.getByTestId('job-offers-search-filter')).toBeVisible({ timeout: 10_000 })

    // Should show "new" tab with 0 offers and empty state
    const newTab = page.getByRole('tab', { name: /nouvelles|new/i })
    await expect(newTab).toBeVisible()

    // Empty state message
    await expect(page.getByText(/aucune nouvelle offre|no new offers/i)).toBeVisible()
  })
})
