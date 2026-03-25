import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import CandidateProfile from '#models/candidate_profile'
import User from '#models/user'
import ProfileService from '#services/profile_service'

const TEST_USER = {
  email: 'profile-unit@example.com',
  password: 'password123',
  fullName: 'Profile Unit User',
  locale: 'en',
}

test.group('ProfileService', (group) => {
  group.each.setup(async () => {
    await db.from('follow_up_sequences').delete()
    await db.from('candidate_profiles').delete()
    await db.from('auth_access_tokens').delete()
    await db.from('users').delete()
  })

  // ---------------------------------------------------------------------------
  // getOrCreateProfile
  // ---------------------------------------------------------------------------

  test('getOrCreateProfile — creates a profile if none exists', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const service = new ProfileService()

    const profile = await service.getOrCreateProfile(user)

    assert.exists(profile.id)
    assert.equal(profile.userId, user.id)
    assert.deepEqual(profile.skills, [])
    assert.equal(profile.experienceYears, 0)
    assert.deepEqual(profile.targetCountries, [])
    assert.isFalse(profile.onboardingCompleted)
  })

  test('getOrCreateProfile — returns existing profile without creating a duplicate', async ({
    assert,
  }) => {
    const user = await User.create(TEST_USER)
    const service = new ProfileService()

    const first = await service.getOrCreateProfile(user)
    const second = await service.getOrCreateProfile(user)

    assert.equal(first.id, second.id)

    const count = await db.from('candidate_profiles').where('user_id', user.id).count('* as total')
    assert.equal(Number(count[0].total), 1)
  })

  // ---------------------------------------------------------------------------
  // updateProfile
  // ---------------------------------------------------------------------------

  test('updateProfile — creates and populates profile on first call', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const service = new ProfileService()

    const profile = await service.updateProfile(user, {
      skills: ['TypeScript', 'Node.js'],
      experienceYears: 5,
      targetCountries: ['NZ'],
      targetSectors: ['Tech'],
      targetRoles: ['Backend Developer'],
    })

    assert.deepEqual(profile.skills, ['TypeScript', 'Node.js'])
    assert.equal(profile.experienceYears, 5)
    assert.deepEqual(profile.targetCountries, ['NZ'])
    assert.deepEqual(profile.targetSectors, ['Tech'])
    assert.deepEqual(profile.targetRoles, ['Backend Developer'])
  })

  test('updateProfile — partial update preserves unchanged fields', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const service = new ProfileService()

    await service.updateProfile(user, {
      skills: ['Python'],
      experienceYears: 3,
      targetCountries: ['AU'],
    })

    const updated = await service.updateProfile(user, {
      skills: ['Python', 'Django'],
    })

    assert.deepEqual(updated.skills, ['Python', 'Django'])
    assert.equal(updated.experienceYears, 3)
    assert.deepEqual(updated.targetCountries, ['AU'])
  })

  test('updateProfile — saves cvText', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const service = new ProfileService()

    const profile = await service.updateProfile(user, {
      cvText: 'John Doe — 5 years TypeScript experience',
    })

    assert.equal(profile.cvText, 'John Doe — 5 years TypeScript experience')
  })

  test('updateProfile — saves sendingSchedule', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const service = new ProfileService()

    const schedule = {
      allowedDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      startHour: 9,
      endHour: 18,
      timezone: 'Pacific/Auckland',
    }

    const profile = await service.updateProfile(user, { sendingSchedule: schedule })

    assert.deepEqual(profile.sendingSchedule, schedule)
  })

  test('updateProfile — saves followUps sequence', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const service = new ProfileService()

    const followUps = [
      { delay: 3, unit: 'days' as const },
      { delay: 1, unit: 'weeks' as const },
    ]

    const profile = await service.updateProfile(user, { followUps })

    assert.deepEqual(profile.followUps, followUps)
  })

  // ---------------------------------------------------------------------------
  // completeOnboarding
  // ---------------------------------------------------------------------------

  test('completeOnboarding — sets onboardingCompleted to true', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const service = new ProfileService()

    await service.updateProfile(user, {
      skills: ['TypeScript'],
      targetCountries: ['NZ'],
    })

    const profile = await service.completeOnboarding(user)

    assert.isTrue(profile.onboardingCompleted)
  })

  test('completeOnboarding — creates default follow-up sequence', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const service = new ProfileService()

    await service.updateProfile(user, {
      skills: ['TypeScript'],
      targetCountries: ['NZ'],
    })

    await service.completeOnboarding(user)

    const sequences = await db.from('follow_up_sequences').where('user_id', user.id)
    assert.lengthOf(sequences, 1)
    assert.equal(sequences[0].delay_days_1, 3)
    assert.equal(sequences[0].delay_days_2, 7)
    assert.equal(sequences[0].delay_days_3, 14)
  })

  test('completeOnboarding — does not create duplicate follow-up sequence', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const service = new ProfileService()

    await service.updateProfile(user, {
      skills: ['TypeScript'],
      targetCountries: ['NZ'],
    })

    await service.completeOnboarding(user)
    await service.completeOnboarding(user)

    const sequences = await db.from('follow_up_sequences').where('user_id', user.id)
    assert.lengthOf(sequences, 1)
  })

  test('completeOnboarding — throws when no skills and no CV', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const service = new ProfileService()

    await CandidateProfile.create({
      userId: user.id,
      skills: [],
      experienceYears: 0,
      targetCountries: ['NZ'],
      targetSectors: [],
      targetRoles: [],
      onboardingCompleted: false,
    })

    await assert.rejects(
      () => service.completeOnboarding(user),
      /skills or a CV/
    )
  })

  test('completeOnboarding — accepts CV text as alternative to skills', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const service = new ProfileService()

    await service.updateProfile(user, {
      cvText: 'Experienced backend developer with 5 years Node.js',
      targetCountries: ['NZ'],
    })

    const profile = await service.completeOnboarding(user)
    assert.isTrue(profile.onboardingCompleted)
  })

  test('completeOnboarding — throws when no target countries', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const service = new ProfileService()

    await CandidateProfile.create({
      userId: user.id,
      skills: ['TypeScript'],
      experienceYears: 0,
      targetCountries: [],
      targetSectors: [],
      targetRoles: [],
      onboardingCompleted: false,
    })

    await assert.rejects(
      () => service.completeOnboarding(user),
      /target country/
    )
  })

  // ---------------------------------------------------------------------------
  // getProfile
  // ---------------------------------------------------------------------------

  test('getProfile — returns null when no profile exists', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const service = new ProfileService()

    const profile = await service.getProfile(user.id)

    assert.isNull(profile)
  })

  test('getProfile — returns profile after creation', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const service = new ProfileService()

    await service.updateProfile(user, { skills: ['Go'] })
    const profile = await service.getProfile(user.id)

    assert.exists(profile)
    assert.deepEqual(profile!.skills, ['Go'])
  })
})
