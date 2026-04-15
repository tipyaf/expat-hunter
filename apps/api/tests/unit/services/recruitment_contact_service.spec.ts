import { test } from '@japa/runner'
import RecruitmentContactService from '#services/recruitment_contact_service'
import User from '#models/user'
import JobSearch from '#models/job_search'
import JobOffer from '#models/job_offer'
import RecruitmentContact from '#models/recruitment_contact'

const TEST_EMAIL = 'recruitment-contact-test@test.com'
const OTHER_USER_EMAIL = 'recruitment-contact-other@test.com'

test.group('RecruitmentContactService', (group) => {
  const service = new RecruitmentContactService()
  let userId: string
  let otherUserId: string
  let offerId: string

  group.setup(async () => {
    const user =
      (await User.findBy('email', TEST_EMAIL)) ??
      (await User.create({
        email: TEST_EMAIL,
        password: 'password123',
        fullName: 'Recruitment Contact Test',
        locale: 'en',
        plan: 'free',
        isAdmin: false,
      }))
    userId = user.id

    const otherUser =
      (await User.findBy('email', OTHER_USER_EMAIL)) ??
      (await User.create({
        email: OTHER_USER_EMAIL,
        password: 'password123',
        fullName: 'Other User',
        locale: 'en',
        plan: 'free',
        isAdmin: false,
      }))
    otherUserId = otherUser.id

    await JobSearch.query().where('userId', userId).delete()

    const search = await JobSearch.create({
      userId,
      roles: ['Software Engineer'],
      countries: ['NZ'],
      platforms: ['seek'],
      seniority: 'senior',
      frequency: 'weekly',
    })

    const offer = await JobOffer.create({
      searchId: search.id,
      title: 'Senior Engineer',
      status: 'new',
    })
    offerId = offer.id

    await RecruitmentContact.query().where('offerId', offerId).delete()
  })

  group.teardown(async () => {
    await RecruitmentContact.query().where('offerId', offerId).delete()
    await JobOffer.query().where('id', offerId).delete()
    await JobSearch.query().where('userId', userId).delete()
    await User.query().whereIn('email', [TEST_EMAIL, OTHER_USER_EMAIL]).delete()
  })

  // ─── Existence checks (kept for fast smoke test) ────────────────────────

  test('exposes createContact, listContacts, updateContact, removeContact, reProspect, detectCrossPipeline, verifyOfferOwnership methods', ({ assert }) => {
    assert.isFunction(service.createContact)
    assert.isFunction(service.listContacts)
    assert.isFunction(service.updateContact)
    assert.isFunction(service.removeContact)
    assert.isFunction(service.reProspect)
    assert.isFunction(service.detectCrossPipeline)
    assert.isFunction(service.verifyOfferOwnership)
  })

  // ─── Behavioral: createContact ──────────────────────────────────────────

  test('createContact — persists a contact with correct fields', async ({ assert }) => {
    // ORACLE: contact.name = 'Alice HR', contact.role = 'HR Manager', contact.email = 'alice@acme.com'
    const contact = await service.createContact(offerId, userId, {
      name: 'Alice HR',
      role: 'HR Manager',
      email: 'alice@acme.com',
    })

    assert.equal(contact.name, 'Alice HR')
    assert.equal(contact.role, 'HR Manager')
    assert.equal(contact.email, 'alice@acme.com')
    assert.equal(contact.offerId, offerId)
    assert.equal(contact.userId, userId)
    assert.isDefined(contact.id)
  })

  test('createContact — throws DUPLICATE_CONTACT for duplicate email on same offer', async ({ assert }) => {
    // ORACLE: second insert with same email on same offer → error.code = 'DUPLICATE_CONTACT'
    let thrownCode: string | undefined
    try {
      await service.createContact(offerId, userId, {
        name: 'Alice Duplicate',
        email: 'alice@acme.com',
      })
    } catch (error: unknown) {
      thrownCode = (error as Error & { code?: string }).code
    }
    assert.equal(thrownCode, 'DUPLICATE_CONTACT')
  })

  // ─── Behavioral: listContacts ───────────────────────────────────────────

  test('listContacts — returns all contacts for the offer', async ({ assert }) => {
    // ORACLE: 1 contact created above ('Alice HR') → array length = 1
    const contacts = await service.listContacts(offerId, userId)
    assert.isTrue(contacts.length >= 1)
    assert.isTrue(contacts.every((c) => c.offerId === offerId))
  })

  // ─── Behavioral: updateContact ──────────────────────────────────────────

  test('updateContact — persists field changes', async ({ assert }) => {
    // ORACLE: after update, contact.role = 'Tech Lead'
    const contacts = await service.listContacts(offerId, userId)
    const contact = contacts[0]

    const updated = await service.updateContact(offerId, contact.id, userId, {
      role: 'Tech Lead',
    })

    assert.equal(updated.role, 'Tech Lead')
    assert.equal(updated.name, contact.name) // unchanged
  })

  // ─── Behavioral: verifyOfferOwnership ───────────────────────────────────

  test('verifyOfferOwnership — throws E_ROW_NOT_FOUND for wrong user', async ({ assert }) => {
    // ORACLE: offer belongs to userId, not otherUserId → error.code = 'E_ROW_NOT_FOUND'
    let thrownCode: string | undefined
    try {
      await service.verifyOfferOwnership(offerId, otherUserId)
    } catch (error: unknown) {
      thrownCode = (error as Error & { code?: string }).code
    }
    assert.equal(thrownCode, 'E_ROW_NOT_FOUND')
  })

  // ─── Behavioral: reProspect ─────────────────────────────────────────────

  test('reProspect — throws NO_LINKED_LEAD when contact has no linked lead', async ({ assert }) => {
    // ORACLE: contact was not cross-pipeline linked → no leadId → error.code = 'NO_LINKED_LEAD'
    const contacts = await service.listContacts(offerId, userId)
    const contact = contacts[0]

    let thrownCode: string | undefined
    try {
      await service.reProspect(offerId, contact.id, userId)
    } catch (error: unknown) {
      thrownCode = (error as Error & { code?: string }).code
    }
    assert.equal(thrownCode, 'NO_LINKED_LEAD')
  })

  // ─── Behavioral: removeContact ──────────────────────────────────────────

  test('removeContact — deletes the contact from the database', async ({ assert }) => {
    // ORACLE: after removeContact, DB query for contactId returns null
    const contacts = await service.listContacts(offerId, userId)
    const contact = contacts[0]

    await service.removeContact(offerId, contact.id, userId)

    const deleted = await RecruitmentContact.find(contact.id)
    assert.isNull(deleted)
  })
})
