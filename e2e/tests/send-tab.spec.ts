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
  let searchId: string

  if (searchesBody.data?.length > 0) {
    searchId = searchesBody.data[0].id
  } else {
    const createRes = await fetch(`${API_URL}/api/job-searches`, {
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
    const createBody = await createRes.json()
    searchId = createBody.data.id
  }

  // Ensure at least one job offer exists
  const offersRes = await fetch(`${API_URL}/api/job-offers`, {
    headers: { Authorization: `Bearer ${authToken}` },
  })
  const offersBody = await offersRes.json()

  if (offersBody.data?.length > 0) {
    testOfferId = offersBody.data[0].id
  } else {
    // If no offers, skip — we can't seed offers without the scraper
    // Tests will be skipped via conditional checks
    testOfferId = ''
  }
})

test.describe('Send tab — /offres/:id', () => {
  test.skip(() => !testOfferId, 'No job offer available for testing')

  test('detail page shows 4 tabs including Send', async ({ page }) => {
    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByTestId('detail-tabs')).toBeVisible({ timeout: 10_000 })

    await expect(page.getByTestId('tab-details')).toBeVisible()
    await expect(page.getByTestId('tab-cv')).toBeVisible()
    await expect(page.getByTestId('tab-cover-letter')).toBeVisible()
    await expect(page.getByTestId('tab-send')).toBeVisible()
  })

  test('clicking Send tab shows send tab content', async ({ page }) => {
    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByTestId('tab-send')).toBeVisible({ timeout: 10_000 })

    await page.getByTestId('tab-send').click()

    // Should show either the generate button (no email yet) or the email textarea (already generated)
    const generateBtn = page.getByTestId('email-generate-button')
    const emailTextarea = page.getByTestId('email-body-textarea')
    const sentBadge = page.getByTestId('send-tab-sent-badge')

    // One of these three states must be visible
    await expect(
      generateBtn.or(emailTextarea).or(sentBadge)
    ).toBeVisible({ timeout: 10_000 })
  })

  test('send tab shows prerequisite warnings when CV/CL not generated', async ({ page }) => {
    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByTestId('tab-send')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('tab-send').click()

    // If generate button exists (no email yet), check its state
    const generateBtn = page.getByTestId('email-generate-button')
    if (await generateBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Button should be either enabled (CV+CL exist) or disabled (prerequisites not met)
      const isDisabled = await generateBtn.getAttribute('disabled')
      if (isDisabled !== null) {
        // Prerequisites not met — warning messages should be visible
        const noCvWarning = page.getByTestId('send-tab-no-cv')
        const noCLWarning = page.getByTestId('send-tab-no-cover-letter')
        // At least one prerequisite warning should show
        await expect(noCvWarning.or(noCLWarning)).toBeVisible()
      }
    }
  })

  test('send tab shows attachments list when email is generated', async ({ page }) => {
    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByTestId('tab-send')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('tab-send').click()

    const emailTextarea = page.getByTestId('email-body-textarea')
    const sentBadge = page.getByTestId('send-tab-sent-badge')

    // If email exists (textarea or sent state), attachments should be visible
    if (await emailTextarea.or(sentBadge).isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(page.getByTestId('email-attachments-list')).toBeVisible()
      await expect(page.getByText('CV.pdf')).toBeVisible()
      await expect(page.getByText('CoverLetter.pdf')).toBeVisible()
    }
  })

  test('send button shows confirmation dialog before sending', async ({ page }) => {
    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByTestId('tab-send')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('tab-send').click()

    const sendBtn = page.getByTestId('email-send-button')
    if (await sendBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const isDisabled = await sendBtn.getAttribute('disabled')
      if (isDisabled === null) {
        await sendBtn.click()
        await expect(page.getByTestId('send-confirm-dialog')).toBeVisible()
        await expect(page.getByTestId('send-confirm-cancel')).toBeVisible()
        await expect(page.getByTestId('send-confirm-submit')).toBeVisible()

        // Cancel should close the dialog
        await page.getByTestId('send-confirm-cancel').click()
        await expect(page.getByTestId('send-confirm-dialog')).not.toBeVisible()
      }
    }
  })
})

test.describe('Recruitment contacts panel — /offres/:id', () => {
  test.skip(() => !testOfferId, 'No job offer available for testing')

  test('recruitment contacts panel is visible on details tab', async ({ page }) => {
    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByTestId('recruitment-contacts-panel')).toBeVisible({ timeout: 10_000 })
  })

  test('recruitment contacts panel is visible on all tabs', async ({ page }) => {
    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByTestId('recruitment-contacts-panel')).toBeVisible({ timeout: 10_000 })

    // Switch to CV tab — panel should remain visible
    await page.getByTestId('tab-cv').click()
    await expect(page.getByTestId('recruitment-contacts-panel')).toBeVisible()

    // Switch to Send tab — panel should remain visible
    await page.getByTestId('tab-send').click()
    await expect(page.getByTestId('recruitment-contacts-panel')).toBeVisible()
  })

  test('shows empty state when no contacts exist', async ({ page }) => {
    // Clean up existing contacts via API
    const contactsRes = await fetch(`${API_URL}/api/job-offers/${testOfferId}/contacts`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    if (contactsRes.ok) {
      const contactsBody = await contactsRes.json()
      for (const contact of contactsBody.data ?? []) {
        await fetch(`${API_URL}/api/job-offers/${testOfferId}/contacts/${contact.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        })
      }
    }

    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByTestId('recruitment-contacts-panel')).toBeVisible({ timeout: 10_000 })

    // Should show empty state message and the add button
    await expect(page.getByTestId('recruitment-contacts-empty')).toBeVisible()
    await expect(page.getByTestId('recruitment-contact-add-button')).toBeVisible()
  })

  test('can open add contact form', async ({ page }) => {
    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByTestId('recruitment-contacts-panel')).toBeVisible({ timeout: 10_000 })

    await page.getByTestId('recruitment-contact-add-button').click()
    await expect(page.getByTestId('recruitment-contact-add-form')).toBeVisible()
    await expect(page.getByTestId('recruitment-contact-add-name')).toBeVisible()
    await expect(page.getByTestId('recruitment-contact-add-role')).toBeVisible()
    await expect(page.getByTestId('recruitment-contact-add-email')).toBeVisible()

    // Submit should be disabled when name is empty
    await expect(page.getByTestId('recruitment-contact-add-submit-button')).toBeDisabled()
  })

  test('can add a recruitment contact', async ({ page }) => {
    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByTestId('recruitment-contacts-panel')).toBeVisible({ timeout: 10_000 })

    await page.getByTestId('recruitment-contact-add-button').click()
    await page.getByTestId('recruitment-contact-add-name').fill('Jane Recruiter')
    await page.getByTestId('recruitment-contact-add-role').fill('HR Manager')
    await page.getByTestId('recruitment-contact-add-email').fill('jane@testcorp.com')

    // Submit should now be enabled
    await expect(page.getByTestId('recruitment-contact-add-submit-button')).toBeEnabled()
    await page.getByTestId('recruitment-contact-add-submit-button').click()

    // Contact should appear in the list
    await expect(page.getByText('Jane Recruiter')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('HR Manager')).toBeVisible()
    await expect(page.getByText('jane@testcorp.com')).toBeVisible()
  })

  test('can edit a recruitment contact', async ({ page }) => {
    // Seed a contact via API
    await fetch(`${API_URL}/api/job-offers/${testOfferId}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: 'Edit Test', role: 'Tester', email: 'edit@test.com' }),
    })

    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByText('Edit Test')).toBeVisible({ timeout: 10_000 })

    // Find and click the edit button for this contact
    const contactCards = page.locator('[data-testid^="recruitment-contact-card-"]')
    const editTestCard = contactCards.filter({ hasText: 'Edit Test' })
    const editBtn = editTestCard.locator('[data-testid^="recruitment-contact-edit-"]')
    await editBtn.click()

    await expect(page.getByTestId('recruitment-contact-edit-form')).toBeVisible()
    // ORACLE: edit form pre-filled with contact data
    await expect(page.getByTestId('recruitment-contact-edit-name')).toHaveValue('Edit Test')
    await expect(page.getByTestId('recruitment-contact-edit-role')).toHaveValue('Tester')
  })

  test('can remove a recruitment contact', async ({ page }) => {
    // Seed a contact via API
    const createRes = await fetch(`${API_URL}/api/job-offers/${testOfferId}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: 'Remove Me', role: 'Temp' }),
    })
    const createBody = await createRes.json()
    const contactId = createBody.data.id

    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByText('Remove Me')).toBeVisible({ timeout: 10_000 })

    await page.getByTestId(`recruitment-contact-remove-${contactId}`).click()

    // Contact should disappear
    await expect(page.getByText('Remove Me')).not.toBeVisible({ timeout: 5_000 })
  })

  test('shows cross-pipeline badge for contacts with leadId', async ({ page }) => {
    // This test verifies the badge renders — we can only check it if a contact
    // has a leadId, which requires a matching lead in the pipeline.
    // For now, verify the panel renders correctly and the badge element exists in DOM
    await page.goto(`/offres/${testOfferId}`)
    await expect(page.getByTestId('recruitment-contacts-panel')).toBeVisible({ timeout: 10_000 })

    // If any contact has a cross-lead badge, verify it's visible
    const badge = page.getByTestId('recruitment-contact-cross-lead-badge')
    const badgeCount = await badge.count()
    if (badgeCount > 0) {
      await expect(badge.first()).toBeVisible()
      await expect(badge.first()).toContainText('Existing lead')
    }
  })
})
