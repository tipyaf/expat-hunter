import { test } from '@japa/runner'
import JobApplicationSendService from '#services/job_application_send_service'
import PdfService from '#services/pdf_service'
import User from '#models/user'
import JobSearch from '#models/job_search'
import JobOffer from '#models/job_offer'

const TEST_EMAIL = 'job-app-send-test@test.com'

test.group('JobApplicationSendService', (group) => {
  const service = new JobApplicationSendService()

  // ─── Existence checks ───────────────────────────────────────────────────

  test('exposes generateApplicationEmail, sendApplication, draftFollowUpEmail, getApplicationEmailStatus methods', ({ assert }) => {
    assert.isFunction(service.generateApplicationEmail)
    assert.isFunction(service.sendApplication)
    assert.isFunction(service.draftFollowUpEmail)
    assert.isFunction(service.getApplicationEmailStatus)
  })

  // ─── Behavioral: getApplicationEmailStatus ──────────────────────────────

  test('getApplicationEmailStatus — returns default state when no application exists', async ({ assert }) => {
    let userId: string
    let offerId: string

    const user =
      (await User.findBy('email', TEST_EMAIL)) ??
      (await User.create({
        email: TEST_EMAIL,
        password: 'password123',
        fullName: 'App Send Test',
        locale: 'en',
        plan: 'free',
        isAdmin: false,
      }))
    userId = user.id

    const search = await JobSearch.create({
      userId,
      roles: ['Developer'],
      countries: ['NZ'],
      platforms: ['seek'],
      seniority: 'mid',
      frequency: 'weekly',
    })

    const offer = await JobOffer.create({
      searchId: search.id,
      title: 'Developer',
      status: 'new',
    })
    offerId = offer.id

    // ORACLE: no JobApplication row exists → hasEmail=false, emailText=null, status='draft', sentAt=null, sentToEmail=null
    const status = await service.getApplicationEmailStatus(offerId, userId)
    assert.isFalse(status.hasEmail)
    assert.isNull(status.emailText)
    assert.equal(status.status, 'draft')
    assert.isNull(status.sentAt)
    assert.isNull(status.sentToEmail)

    // Cleanup
    await JobOffer.query().where('id', offerId).delete()
    await JobSearch.query().where('id', search.id).delete()
    await User.query().where('email', TEST_EMAIL).delete()
  })
})

test.group('PdfService', () => {
  test('textToBuffer returns a non-empty Buffer for plain text', async ({ assert }) => {
    // ORACLE: any non-empty text → Buffer.length > 0
    const service = new PdfService()
    const buffer = await service.textToBuffer('Hello World\nLine 2', 'Test PDF')
    assert.instanceOf(buffer, Buffer)
    assert.isTrue(buffer.length > 0)
  })

  test('textToBuffer starts with PDF magic bytes %PDF', async ({ assert }) => {
    // ORACLE: valid PDF starts with the bytes for "%PDF"
    const service = new PdfService()
    const buffer = await service.textToBuffer('Content', 'Title')
    const header = buffer.subarray(0, 4).toString('ascii')
    assert.equal(header, '%PDF')
  })
})
