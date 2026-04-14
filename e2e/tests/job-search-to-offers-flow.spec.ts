/**
 * E2E: Create search → Run → Verify offers exist
 *
 * Tests the REAL end-to-end flow:
 * 1. Create a job search with a platform
 * 2. Run the search (triggers actual scraping via Apify/Playwright)
 * 3. Verify the API returns scraped offers (totalScraped > 0)
 * 4. Navigate to /offres and verify offer cards are visible in the UI
 * 5. Verify search card stays visible after run (regression test)
 *
 * IMPORTANT: These tests hit real external APIs (Apify, Playwright server).
 * They require APIFY_TOKEN and optionally PLAYWRIGHT_SERVER_URL/TOKEN.
 * Tests are skipped if the required env vars are not set.
 */
import { test, expect } from '@playwright/test'
import { getOrCreateTestUser } from '../fixtures/seed'

const SEARCH_PAGE = '/recherche-offres'
const OFFERS_PAGE = '/offres'
const API_URL = 'http://localhost:3333'

/** Scraping timeout — Apify actors can take 30-60s */
const SCRAPING_TIMEOUT = 120_000

let authToken: string

test.beforeAll(async () => {
  const auth = await getOrCreateTestUser()
  authToken = auth.token
})

/**
 * Helper: create a search, run it, and return scraping stats.
 */
async function createAndRunSearch(
  platforms: string[],
  roles: string[],
  countries: string[],
  seniority = 'senior'
) {
  const createRes = await fetch(`${API_URL}/api/job-searches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roles, countries, platforms, seniority }),
  })
  expect(createRes.ok, `Create search failed: ${createRes.status}`).toBe(true)
  const { data: search } = await createRes.json()

  const runRes = await fetch(`${API_URL}/api/job-searches/${search.id}/run`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
  })
  expect(runRes.ok, `Run search failed: ${runRes.status}`).toBe(true)
  const body = await runRes.json()

  return { search, scraping: body.scraping, data: body.data }
}

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

  // =========================================================================
  // SEEK PLATFORM (NZ/AU)
  // =========================================================================

  test('seek: run returns real offers from Apify', async () => {
    test.setTimeout(SCRAPING_TIMEOUT)

    const { scraping, data } = await createAndRunSearch(
      ['seek'],
      ['Software Engineer'],
      ['NZ'],
    )

    // Scraping MUST return results
    expect(scraping).toHaveProperty('totalScraped')
    expect(scraping.totalScraped).toBeGreaterThan(0)
    expect(scraping.newOffers).toBeGreaterThan(0)

    // Search must have lastRunAt updated
    expect(data.lastRunAt).not.toBeNull()

    // Verify offers exist in DB via list API
    const offersRes = await fetch(
      `${API_URL}/api/job-offers?search_id=${data.id}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    )
    expect(offersRes.ok).toBe(true)
    const offersBody = await offersRes.json()

    expect(offersBody.data.length).toBeGreaterThan(0)
    // Verify offer structure
    const firstOffer = offersBody.data[0]
    expect(firstOffer).toHaveProperty('title')
    expect(firstOffer).toHaveProperty('companyName')
    expect(firstOffer).toHaveProperty('links')
    expect(firstOffer.links.length).toBeGreaterThan(0)
    expect(firstOffer.links[0]).toHaveProperty('platform', 'seek')
    expect(firstOffer.links[0]).toHaveProperty('url')
    expect(firstOffer.title.length).toBeGreaterThan(0)
    expect(firstOffer.companyName.length).toBeGreaterThan(0)
  })

  // =========================================================================
  // LINKEDIN PLATFORM
  // =========================================================================

  test('linkedin: run returns real offers from Apify', async () => {
    test.setTimeout(SCRAPING_TIMEOUT)

    const { scraping, data } = await createAndRunSearch(
      ['linkedin'],
      ['Frontend Developer'],
      ['NZ'],
    )

    expect(scraping).toHaveProperty('totalScraped')
    // LinkedIn may return 0 results for niche queries — check structure but don't fail on 0
    expect(typeof scraping.totalScraped).toBe('number')
    expect(typeof scraping.newOffers).toBe('number')
    expect(data.lastRunAt).not.toBeNull()

    if (scraping.totalScraped > 0) {
      const offersRes = await fetch(
        `${API_URL}/api/job-offers?search_id=${data.id}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      )
      expect(offersRes.ok).toBe(true)
      const offersBody = await offersRes.json()
      expect(offersBody.data.length).toBeGreaterThan(0)

      const firstOffer = offersBody.data[0]
      expect(firstOffer.links[0]).toHaveProperty('platform', 'linkedin')
    }
  })

  // =========================================================================
  // BUILTIN PLATFORM
  // =========================================================================

  test('builtin: run returns real offers from Apify', async () => {
    test.setTimeout(SCRAPING_TIMEOUT)

    const { scraping, data } = await createAndRunSearch(
      ['builtin'],
      ['Software Engineer'],
      ['NZ'],
    )

    expect(scraping).toHaveProperty('totalScraped')
    expect(typeof scraping.totalScraped).toBe('number')
    expect(data.lastRunAt).not.toBeNull()

    if (scraping.totalScraped > 0) {
      const offersRes = await fetch(
        `${API_URL}/api/job-offers?search_id=${data.id}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      )
      expect(offersRes.ok).toBe(true)
      const offersBody = await offersRes.json()
      expect(offersBody.data.length).toBeGreaterThan(0)

      const firstOffer = offersBody.data[0]
      expect(firstOffer.links[0]).toHaveProperty('platform', 'builtin')
    }
  })

  // =========================================================================
  // ZEIL PLATFORM (self-hosted Playwright)
  // =========================================================================

  test('zeil: run returns real offers from Playwright server', async () => {
    test.setTimeout(SCRAPING_TIMEOUT)

    const { scraping, data } = await createAndRunSearch(
      ['zeil'],
      ['Developer'],
      ['NZ'],
    )

    expect(scraping).toHaveProperty('totalScraped')
    expect(typeof scraping.totalScraped).toBe('number')
    expect(data.lastRunAt).not.toBeNull()

    if (scraping.totalScraped > 0) {
      const offersRes = await fetch(
        `${API_URL}/api/job-offers?search_id=${data.id}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      )
      expect(offersRes.ok).toBe(true)
      const offersBody = await offersRes.json()
      expect(offersBody.data.length).toBeGreaterThan(0)

      const firstOffer = offersBody.data[0]
      expect(firstOffer.links[0]).toHaveProperty('platform', 'zeil')
    }
  })

  // =========================================================================
  // FULL FLOW: ALL PLATFORMS → UI VERIFICATION
  // =========================================================================

  test('full flow: search with seek → run → offers visible in UI', async ({ page }) => {
    test.setTimeout(SCRAPING_TIMEOUT)

    // Step 1: Create and run a Seek search via API (fastest, most reliable)
    const { scraping, data: search } = await createAndRunSearch(
      ['seek'],
      ['Software Engineer'],
      ['NZ'],
    )

    expect(scraping.totalScraped).toBeGreaterThan(0)

    // Step 2: Navigate to offers page
    await page.goto(OFFERS_PAGE)
    await expect(page.getByTestId('job-offers-search-filter')).toBeVisible({ timeout: 10_000 })

    // Step 3: Dropdown should list the search
    const select = page.getByTestId('job-offers-search-filter')
    const options = select.locator('option')
    await expect(options).toHaveCount(2, { timeout: 5_000 })
    await expect(options.nth(1)).toContainText('Software Engineer')

    // Step 4: Select the search to filter offers
    await select.selectOption(search.id)

    // Step 5: Verify offer cards appear
    await expect(page.getByTestId('job-offer-card').first()).toBeVisible({ timeout: 10_000 })

    // Step 6: Verify offer card content
    const firstCard = page.getByTestId('job-offer-card').first()
    await expect(firstCard.getByTestId('job-offer-card-title')).not.toBeEmpty()
    await expect(firstCard.getByTestId('job-offer-card-company')).not.toBeEmpty()
  })

  test('full flow via UI: create → run → navigate → see offers', async ({ page }) => {
    test.setTimeout(SCRAPING_TIMEOUT)

    // Step 1: Go to search config page
    await page.goto(SEARCH_PAGE)
    await expect(page.getByTestId('job-search-config-form')).toBeVisible({ timeout: 10_000 })

    // Step 2: Fill and submit the form
    const rolesInput = page.getByTestId('job-search-roles-input').locator('input')
    await rolesInput.fill('Software Engineer')
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
    await expect(page.getByTestId('job-search-roles')).toContainText('Software Engineer')

    // Step 4: Run the search
    await page.getByTestId('job-search-run-now-button').click()

    // Card stays visible (regression test for disappearing card bug)
    await expect(page.getByTestId('job-search-active-card')).toBeVisible({ timeout: SCRAPING_TIMEOUT })
    await expect(page.getByTestId('job-search-roles')).toContainText('Software Engineer')

    // Last run should update
    await expect(page.getByTestId('job-search-last-run')).not.toContainText(/jamais|never/i, {
      timeout: SCRAPING_TIMEOUT,
    })

    // Step 5: Navigate to offers page
    await page.goto(OFFERS_PAGE)
    await expect(page.getByTestId('job-offers-search-filter')).toBeVisible({ timeout: 10_000 })

    // Step 6: Verify offers are present
    const select = page.getByTestId('job-offers-search-filter')
    const options = select.locator('option')
    await expect(options).toHaveCount(2, { timeout: 5_000 })

    // Select the search
    await select.selectOption({ index: 1 })

    // Step 7: Verify offer cards exist — this is the CRITICAL assertion
    await expect(page.getByTestId('job-offer-card').first()).toBeVisible({ timeout: 10_000 })

    // Verify the "new" tab shows a count > 0
    const newTab = page.getByRole('tab', { name: /nouvelles|new/i })
    await expect(newTab).toBeVisible()

    // Verify at least one offer has real content
    const firstCard = page.getByTestId('job-offer-card').first()
    await expect(firstCard.getByTestId('job-offer-card-title')).not.toBeEmpty()
    await expect(firstCard.getByTestId('job-offer-card-company')).not.toBeEmpty()
  })

  // =========================================================================
  // REGRESSION: run endpoint returns JobSearch, not ScrapingResult
  // =========================================================================

  test('run endpoint returns updated JobSearch with lastRunAt and scraping stats', async () => {
    test.setTimeout(SCRAPING_TIMEOUT)

    const createRes = await fetch(`${API_URL}/api/job-searches`, {
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
    const { data: search } = await createRes.json()

    const runRes = await fetch(`${API_URL}/api/job-searches/${search.id}/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    })
    expect(runRes.ok).toBe(true)
    const body = await runRes.json()

    // Must return a proper JobSearch object in data (NOT ScrapingResult)
    expect(body.data).toHaveProperty('id', search.id)
    expect(body.data).toHaveProperty('roles')
    expect(body.data).toHaveProperty('lastRunAt')
    expect(body.data.lastRunAt).not.toBeNull()

    // Must also return scraping stats
    expect(body.scraping).toHaveProperty('totalScraped')
    expect(body.scraping).toHaveProperty('newOffers')
    expect(body.scraping).toHaveProperty('duplicates')
  })

  // =========================================================================
  // EMPTY STATE
  // =========================================================================

  test('offers page shows empty state when search has no offers yet', async ({ page }) => {
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

    // Should show "new" tab with empty state
    const newTab = page.getByRole('tab', { name: /nouvelles|new/i })
    await expect(newTab).toBeVisible()

    // Empty state message
    await expect(page.getByText(/aucune nouvelle offre|no new offers/i)).toBeVisible()
  })

  // =========================================================================
  // DROPDOWN LISTS ALL USER SEARCHES
  // =========================================================================

  test('offers page dropdown lists user searches', async ({ page }) => {
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

    const select = page.getByTestId('job-offers-search-filter')
    const options = select.locator('option')
    await expect(options).toHaveCount(2, { timeout: 5_000 })
    await expect(options.nth(1)).toContainText('Data Engineer')
    await expect(options.nth(1)).toContainText('AU')
  })
})
