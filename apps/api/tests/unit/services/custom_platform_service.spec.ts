import { test } from '@japa/runner'
import { PLAN_FREE, PLAN_PREMIUM, PLATFORM_SUGGESTIONS, FREE_MAX_CUSTOM_PLATFORMS } from '@expat-hunter/shared'
import CustomPlatformService from '#services/custom_platform_service'
import CustomPlatform from '#models/custom_platform'
import User from '#models/user'

// =============================================================================
// PLATFORM_SUGGESTIONS — constant tests
// =============================================================================

test.group('PLATFORM_SUGGESTIONS', () => {
  test('NZ suggestions include TradeMe', ({ assert }) => {
    // ORACLE: NZ → suggestions include TradeMe Jobs
    const suggestions = PLATFORM_SUGGESTIONS['NZ']
    assert.isArray(suggestions)
    assert.isTrue(suggestions.length >= 2, 'NZ should have at least 2 suggestions')
    assert.isTrue(
      suggestions.some((s) => s.name.includes('TradeMe')),
      'NZ should include TradeMe'
    )
  })

  test('unknown country returns undefined (empty)', ({ assert }) => {
    // ORACLE: XX → undefined (no suggestions)
    const suggestions = PLATFORM_SUGGESTIONS['XX']
    assert.isUndefined(suggestions)
  })

  test('AU has at least 2 suggestions', ({ assert }) => {
    const suggestions = PLATFORM_SUGGESTIONS['AU']
    assert.isArray(suggestions)
    assert.isTrue(suggestions.length >= 2)
  })
})

// =============================================================================
// CustomPlatformService — CRUD + enforcement
// =============================================================================

test.group('CustomPlatformService', (group) => {
  const service = new CustomPlatformService()
  const TEST_EMAIL_A = 'custom-plat-test-a@example.com'
  const TEST_EMAIL_B = 'custom-plat-test-b@example.com'
  let userAId: string
  let userBId: string

  group.setup(async () => {
    const userA = (await User.findBy('email', TEST_EMAIL_A)) ?? (await User.create({
      email: TEST_EMAIL_A,
      password: 'password123',
      fullName: 'Custom Platform Test A',
      locale: 'en',
      plan: 'free',
      isAdmin: false,
    }))
    userAId = userA.id

    const userB = (await User.findBy('email', TEST_EMAIL_B)) ?? (await User.create({
      email: TEST_EMAIL_B,
      password: 'password123',
      fullName: 'Custom Platform Test B',
      locale: 'en',
      plan: 'free',
      isAdmin: false,
    }))
    userBId = userB.id

    await CustomPlatform.query().where('userId', userAId).delete()
    await CustomPlatform.query().where('userId', userBId).delete()
  })

  group.teardown(async () => {
    await CustomPlatform.query().where('userId', userAId).delete()
    await CustomPlatform.query().where('userId', userBId).delete()
    await User.query().where('email', TEST_EMAIL_A).delete()
    await User.query().where('email', TEST_EMAIL_B).delete()
  })

  group.each.teardown(async () => {
    await CustomPlatform.query().where('userId', userAId).delete()
    await CustomPlatform.query().where('userId', userBId).delete()
  })

  // --- CREATE ---

  test('create: saves a custom platform and returns it', async ({ assert }) => {
    const result = await service.create(userAId, PLAN_FREE, {
      name: 'TradeMe Jobs',
      url: 'https://trademe.co.nz/jobs',
      country: 'NZ',
    })

    // ORACLE: platform created with correct fields
    assert.isDefined(result.id)
    assert.equal(result.name, 'TradeMe Jobs')
    assert.equal(result.url, 'https://trademe.co.nz/jobs')
    assert.equal(result.userId, userAId)
    assert.equal(result.country, 'NZ')
    assert.isTrue(result.isActive)
  })

  test('create: normalizes URL by stripping trailing slash', async ({ assert }) => {
    const result = await service.create(userAId, PLAN_FREE, {
      name: 'TradeMe',
      url: 'https://trademe.co.nz/jobs/',
    })

    // ORACLE: trailing slash stripped
    assert.equal(result.url, 'https://trademe.co.nz/jobs')
  })

  test('create: duplicate URL for same user returns 409 DUPLICATE_PLATFORM', async ({ assert }) => {
    await service.create(userAId, PLAN_FREE, {
      name: 'TradeMe Jobs',
      url: 'https://trademe.co.nz/jobs',
    })

    try {
      await service.create(userAId, PLAN_FREE, {
        name: 'Dupe',
        url: 'https://trademe.co.nz/jobs',
      })
      assert.fail('Expected DUPLICATE_PLATFORM error')
    } catch (error: unknown) {
      const err = error as Error & { status: number; code: string }
      // ORACLE: 409 + DUPLICATE_PLATFORM
      assert.equal(err.status, 409)
      assert.equal(err.code, 'DUPLICATE_PLATFORM')
    }
  })

  test('create: same URL different user is allowed', async ({ assert }) => {
    await service.create(userAId, PLAN_FREE, {
      name: 'TradeMe Jobs',
      url: 'https://trademe.co.nz/jobs',
    })

    const result = await service.create(userBId, PLAN_FREE, {
      name: 'TradeMe',
      url: 'https://trademe.co.nz/jobs',
    })

    // ORACLE: succeeds — unique is per user
    assert.equal(result.userId, userBId)
    assert.equal(result.url, 'https://trademe.co.nz/jobs')
  })

  test('create: free user limited to FREE_MAX_CUSTOM_PLATFORMS', async ({ assert }) => {
    // Create up to the limit
    for (let i = 0; i < FREE_MAX_CUSTOM_PLATFORMS; i++) {
      await service.create(userAId, PLAN_FREE, {
        name: `Platform ${i}`,
        url: `https://platform${i}.com`,
      })
    }

    try {
      await service.create(userAId, PLAN_FREE, {
        name: 'One Too Many',
        url: 'https://over-limit.com',
      })
      assert.fail('Expected QUOTA_EXCEEDED error')
    } catch (error: unknown) {
      const err = error as Error & { status: number; code: string }
      // ORACLE: free limit enforced → 403 QUOTA_EXCEEDED
      assert.equal(err.status, 403)
      assert.equal(err.code, 'QUOTA_EXCEEDED')
    }
  })

  test('create: premium user can exceed free limit', async ({ assert }) => {
    for (let i = 0; i < FREE_MAX_CUSTOM_PLATFORMS; i++) {
      await service.create(userAId, PLAN_PREMIUM, {
        name: `Platform ${i}`,
        url: `https://platform${i}.com`,
      })
    }

    const result = await service.create(userAId, PLAN_PREMIUM, {
      name: 'Extra Platform',
      url: 'https://extra.com',
    })

    // ORACLE: premium can add beyond free limit
    assert.isDefined(result.id)
    assert.equal(result.name, 'Extra Platform')
  })

  // --- LIST ---

  test('list: returns only platforms for the given userId', async ({ assert }) => {
    await service.create(userAId, PLAN_FREE, {
      name: 'User A Platform',
      url: 'https://a.com',
    })
    await service.create(userBId, PLAN_FREE, {
      name: 'User B Platform',
      url: 'https://b.com',
    })

    const listA = await service.list(userAId)
    const listB = await service.list(userBId)

    // ORACLE: each user sees only their own platforms
    assert.lengthOf(listA, 1)
    assert.equal(listA[0].name, 'User A Platform')
    assert.lengthOf(listB, 1)
    assert.equal(listB[0].name, 'User B Platform')
  })

  // --- REMOVE ---

  test('remove: deletes platform for the correct user', async ({ assert }) => {
    const created = await service.create(userAId, PLAN_FREE, {
      name: 'To Delete',
      url: 'https://delete-me.com',
    })

    await service.remove(userAId, created.id)

    const list = await service.list(userAId)
    // ORACLE: platform removed
    assert.lengthOf(list, 0)
  })

  test('remove: returns 404 when platform not found', async ({ assert }) => {
    try {
      await service.remove(userAId, '00000000-0000-0000-0000-000000000000')
      assert.fail('Expected NOT_FOUND error')
    } catch (error: unknown) {
      const err = error as Error & { status: number; code: string }
      // ORACLE: 404 NOT_FOUND
      assert.equal(err.status, 404)
      assert.equal(err.code, 'NOT_FOUND')
    }
  })

  test('remove: user cannot delete another user platform', async ({ assert }) => {
    const created = await service.create(userAId, PLAN_FREE, {
      name: 'User A Only',
      url: 'https://a-only.com',
    })

    try {
      await service.remove(userBId, created.id)
      assert.fail('Expected NOT_FOUND error')
    } catch (error: unknown) {
      const err = error as Error & { status: number; code: string }
      // ORACLE: cross-user access blocked → 404
      assert.equal(err.status, 404)
    }
  })

  // --- SUGGESTIONS ---

  test('getSuggestions: returns platforms for known country', ({ assert }) => {
    const suggestions = service.getSuggestions('NZ')
    // ORACLE: NZ has at least 2 suggestions including TradeMe
    assert.isArray(suggestions)
    assert.isTrue(suggestions.length >= 2)
    assert.isTrue(suggestions.some((s) => s.name.includes('TradeMe')))
  })

  test('getSuggestions: returns empty for unknown country', ({ assert }) => {
    const suggestions = service.getSuggestions('XX')
    // ORACLE: unknown country → empty array
    assert.lengthOf(suggestions, 0)
  })

  test('getSuggestions: case insensitive (nz → NZ)', ({ assert }) => {
    const suggestions = service.getSuggestions('nz')
    // ORACLE: lowercase 'nz' → same as 'NZ'
    assert.isTrue(suggestions.length >= 2)
  })
})
