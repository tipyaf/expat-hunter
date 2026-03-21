import { test as setup, expect } from '@playwright/test'
import { getOrCreateTestUser, TEST_USER } from '../fixtures/seed'

setup('authenticate and seed data', async ({ page }) => {
  // Step 1: Get or create test user via API
  const auth = await getOrCreateTestUser()
  expect(auth.token).toBeTruthy()

  // Step 2: Seed candidate profile via API
  const profileRes = await fetch('http://localhost:3333/api/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({
      skills: ['TypeScript', 'Node.js', 'React'],
      experienceYears: 8,
      targetCountries: ['NZ', 'AU'],
      targetSectors: ['technology', 'digital'],
      targetRoles: ['CTO', 'Tech Lead', 'Senior Developer'],
    }),
  })

  // Step 3: Complete onboarding if not done
  await fetch('http://localhost:3333/api/profile/complete-onboarding', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
  })

  // Step 4: Login through the UI to get proper auth state
  await page.goto('http://localhost:3000/login')
  await page.fill('input[type="email"]', TEST_USER.email)
  await page.fill('input[type="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')

  // Step 5: Wait for redirect to dashboard (onboarding completed)
  await page.waitForURL('http://localhost:3000/', { timeout: 15_000 })
  await expect(page.locator('h1')).toContainText('Dashboard', { timeout: 10_000 })

  // Step 6: Save storage state for other tests
  await page.context().storageState({ path: './fixtures/auth-state.json' })
})
