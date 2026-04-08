import { test } from '@japa/runner'
import JobOfferService from '../../../app/services/job_offer_service.js'
import { OFFER_PAGE_SIZE } from '@expat-hunter/shared'

test.group('JobOfferService', () => {
  test('constructor creates service instance', ({ assert }) => {
    const service = new JobOfferService()
    assert.instanceOf(service, JobOfferService)
  })

  test('has list method that accepts ListOffersParams', ({ assert }) => {
    const service = new JobOfferService()
    assert.isFunction(service.list)
  })

  test('has findOrFail method', ({ assert }) => {
    const service = new JobOfferService()
    assert.isFunction(service.findOrFail)
  })

  test('has updateStatus method', ({ assert }) => {
    const service = new JobOfferService()
    assert.isFunction(service.updateStatus)
  })

  test('OFFER_PAGE_SIZE constant is 20', ({ assert }) => {
    // ORACLE: OFFER_PAGE_SIZE = 20 (from shared constants)
    assert.equal(OFFER_PAGE_SIZE, 20)
  })
})
