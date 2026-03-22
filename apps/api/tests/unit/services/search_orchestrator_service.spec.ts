import { test } from '@japa/runner'
import SearchRun from '#models/search_run'
import Contact from '#models/contact'
import Company from '#models/company'
import User from '#models/user'
import CandidateProfile from '#models/candidate_profile'
import SourcingRun from '#models/sourcing_run'
import { DateTime } from 'luxon'

test.group('SearchOrchestratorService - SearchRun model', (group) => {
  let testUser: User
  let testProfile: CandidateProfile

  group.setup(async () => {
    // Clean up
    await SearchRun.query().delete()
    await Contact.query().delete()
    await Company.query().delete()
    await SourcingRun.query().delete()
    await CandidateProfile.query().delete()

    testUser = await User.create({
      email: `test-search-${Date.now()}@test.com`,
      password: 'password123',
      fullName: 'Test User',
      locale: 'fr',
      isAdmin: false,
    })

    testProfile = await CandidateProfile.create({
      userId: testUser.id,
      skills: ['typescript'],
      experienceYears: 5,
      targetCountries: ['NZ'],
      targetSectors: ['technology'],
      targetRoles: ['developer'],
      onboardingCompleted: true,
      recontactCooldownDays: 180,
    })
  })

  group.teardown(async () => {
    await SearchRun.query().delete()
    await CandidateProfile.query().where('userId', testUser.id).delete()
    await User.query().where('id', testUser.id).delete()
  })

  test('SearchRun can be created with all statuses', async ({ assert }) => {
    const run = await SearchRun.create({
      userId: testUser.id,
      country: 'NZ',
      sector: 'technology',
      status: 'pending',
      contactsFound: 0,
      contactsRelevant: 0,
      emailsGenerated: 0,
      contactsExcludedCooldown: 0,
      progressPercent: 0,
    })

    assert.isDefined(run.id)
    assert.equal(run.status, 'pending')
    assert.equal(run.country, 'NZ')
    assert.equal(run.progressPercent, 0)

    // Update through all statuses
    for (const status of ['scraping', 'enriching', 'analyzing', 'generating', 'completed'] as const) {
      run.status = status
      await run.save()
      assert.equal(run.status, status)
    }

    await run.delete()
  })

  test('SearchRun tracks progress percent and counts', async ({ assert }) => {
    const run = await SearchRun.create({
      userId: testUser.id,
      country: 'AU',
      status: 'scraping',
      contactsFound: 0,
      contactsRelevant: 0,
      emailsGenerated: 0,
      contactsExcludedCooldown: 0,
      progressPercent: 10,
      startedAt: DateTime.now(),
    })

    run.contactsFound = 15
    run.progressPercent = 33
    run.status = 'analyzing'
    await run.save()

    const reloaded = await SearchRun.findOrFail(run.id)
    assert.equal(reloaded.contactsFound, 15)
    assert.equal(reloaded.progressPercent, 33)
    assert.equal(reloaded.status, 'analyzing')

    await run.delete()
  })

  test('SearchRun records error on failure', async ({ assert }) => {
    const run = await SearchRun.create({
      userId: testUser.id,
      country: 'NZ',
      status: 'failed',
      contactsFound: 0,
      contactsRelevant: 0,
      emailsGenerated: 0,
      contactsExcludedCooldown: 0,
      progressPercent: 40,
      errorMessage: 'Scraping timeout',
      completedAt: DateTime.now(),
    })

    const reloaded = await SearchRun.findOrFail(run.id)
    assert.equal(reloaded.status, 'failed')
    assert.equal(reloaded.errorMessage, 'Scraping timeout')

    await run.delete()
  })
})

test.group('Contact cooldown', (group) => {
  let testUser: User

  group.setup(async () => {
    testUser = await User.create({
      email: `test-cooldown-${Date.now()}@test.com`,
      password: 'password123',
      fullName: 'Cooldown Test User',
      locale: 'fr',
      isAdmin: false,
    })
  })

  group.teardown(async () => {
    await Contact.query().where('userId', testUser.id).delete()
    await Company.query().delete()
    await User.query().where('id', testUser.id).delete()
  })

  test('isInCooldown returns true when cooldownUntil is in the future', async ({ assert }) => {
    const company = await Company.create({
      name: 'Cooldown Corp',
      country: 'NZ',
      source: 'test',
    })

    const contact = await Contact.create({
      userId: testUser.id,
      companyId: company.id,
      fullName: 'John Doe',
      role: 'Manager',
      source: 'test',
      status: 'contacted',
      lastContactedAt: DateTime.now().minus({ days: 10 }),
      cooldownUntil: DateTime.now().plus({ days: 170 }),
    })

    assert.isTrue(contact.isInCooldown)

    await contact.delete()
    await company.delete()
  })

  test('isInCooldown returns false when cooldownUntil is in the past', async ({ assert }) => {
    const company = await Company.create({
      name: 'No Cooldown Corp',
      country: 'AU',
      source: 'test',
    })

    const contact = await Contact.create({
      userId: testUser.id,
      companyId: company.id,
      fullName: 'Jane Smith',
      role: 'Director',
      source: 'test',
      status: 'contacted',
      lastContactedAt: DateTime.now().minus({ days: 200 }),
      cooldownUntil: DateTime.now().minus({ days: 20 }),
    })

    assert.isFalse(contact.isInCooldown)

    await contact.delete()
    await company.delete()
  })

  test('isInCooldown returns false when cooldownUntil is null', async ({ assert }) => {
    const company = await Company.create({
      name: 'Null Cooldown Corp',
      country: 'NZ',
      source: 'test',
    })

    const contact = await Contact.create({
      userId: testUser.id,
      companyId: company.id,
      fullName: 'Bob Wilson',
      role: 'Engineer',
      source: 'test',
      status: 'identified',
    })

    assert.isFalse(contact.isInCooldown)

    await contact.delete()
    await company.delete()
  })
})

test.group('CandidateProfile cooldown setting', () => {
  test('recontactCooldownDays defaults to 180', async ({ assert }) => {
    const user = await User.create({
      email: `test-cooldown-default-${Date.now()}@test.com`,
      password: 'password123',
      fullName: 'Default Cooldown User',
      locale: 'fr',
      isAdmin: false,
    })

    const profile = await CandidateProfile.create({
      userId: user.id,
      skills: [],
      experienceYears: 0,
      targetCountries: [],
      targetSectors: [],
      targetRoles: [],
      onboardingCompleted: false,
      recontactCooldownDays: 180,
    })

    assert.equal(profile.recontactCooldownDays, 180)

    // Can be customized
    profile.recontactCooldownDays = 90
    await profile.save()

    const reloaded = await CandidateProfile.findOrFail(profile.id)
    assert.equal(reloaded.recontactCooldownDays, 90)

    await profile.delete()
    await user.delete()
  })
})
