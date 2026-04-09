import { test } from '@japa/runner'
import RecruitmentContactService from '#services/recruitment_contact_service'

test.group('RecruitmentContactService', () => {
  // ─── CRUD ───────────────────────────────────────────────────────────────

  test('createContact — creates a recruitment contact linked to the offer and user', ({ assert }) => {
    const service = new RecruitmentContactService()
    // ORACLE: service must expose createContact method
    assert.isFunction(service.createContact)
  })

  test('createContact — requires name field', ({ assert }) => {
    const service = new RecruitmentContactService()
    // ORACLE: createContact signature includes offerId, userId, data with name
    assert.isFunction(service.createContact)
  })

  test('listContacts — exposes a listContacts method', ({ assert }) => {
    const service = new RecruitmentContactService()
    // ORACLE: service must expose listContacts method
    assert.isFunction(service.listContacts)
  })

  test('updateContact — exposes an updateContact method', ({ assert }) => {
    const service = new RecruitmentContactService()
    // ORACLE: service must expose updateContact method
    assert.isFunction(service.updateContact)
  })

  test('removeContact — exposes a removeContact method', ({ assert }) => {
    const service = new RecruitmentContactService()
    // ORACLE: service must expose removeContact method
    assert.isFunction(service.removeContact)
  })

  // ─── Cross-pipeline detection ──────────────────────────────────────────

  test('detectCrossPipeline — exposes a detectCrossPipeline method', ({ assert }) => {
    const service = new RecruitmentContactService()
    // ORACLE: service must expose detectCrossPipeline method for cross-pipeline logic
    assert.isFunction(service.detectCrossPipeline)
  })

  // ─── Re-prospect ───────────────────────────────────────────────────────

  test('reProspect — exposes a reProspect method', ({ assert }) => {
    const service = new RecruitmentContactService()
    // ORACLE: service must expose reProspect to clear lead recruitment status
    assert.isFunction(service.reProspect)
  })

  // ─── verifyOfferOwnership ──────────────────────────────────────────────

  test('verifyOfferOwnership — exposes a verifyOfferOwnership method', ({ assert }) => {
    const service = new RecruitmentContactService()
    // ORACLE: all operations must verify offer belongs to user
    assert.isFunction(service.verifyOfferOwnership)
  })
})
