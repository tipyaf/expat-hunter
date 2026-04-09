import { test } from '@japa/runner'
import JobApplicationSendService from '#services/job_application_send_service'

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

  test('exposes textToPdfBuffer method', ({ assert }) => {
    const service = new JobApplicationSendService()
    assert.isFunction(service.textToPdfBuffer)
  })

  test('textToPdfBuffer returns a Buffer', async ({ assert }) => {
    const service = new JobApplicationSendService()
    const buffer = await service.textToPdfBuffer('Hello World', 'Test PDF')
    assert.instanceOf(buffer, Buffer)
    assert.isTrue(buffer.length > 0)
  })
})
