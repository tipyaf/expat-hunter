import { test } from '@japa/runner'
import JobApplicationSendService from '#services/job_application_send_service'
import PdfService from '#services/pdf_service'

test.group('JobApplicationSendService', () => {
  test('exposes generateApplicationEmail method', ({ assert }) => {
    const service = new JobApplicationSendService()
    assert.isFunction(service.generateApplicationEmail)
  })

  test('exposes sendApplication method', ({ assert }) => {
    const service = new JobApplicationSendService()
    assert.isFunction(service.sendApplication)
  })

  test('exposes draftFollowUpEmail method', ({ assert }) => {
    const service = new JobApplicationSendService()
    assert.isFunction(service.draftFollowUpEmail)
  })

  test('exposes getApplicationEmailStatus method', ({ assert }) => {
    const service = new JobApplicationSendService()
    assert.isFunction(service.getApplicationEmailStatus)
  })
})

test.group('PdfService', () => {
  test('textToBuffer returns a Buffer', async ({ assert }) => {
    const service = new PdfService()
    const buffer = await service.textToBuffer('Hello World', 'Test PDF')
    assert.instanceOf(buffer, Buffer)
    assert.isTrue(buffer.length > 0)
  })
})
