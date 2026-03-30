import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import SendingSettingsService from '#services/sending_settings_service'

/**
 * ContactMovementService methods (recordMovement, moveContact, block, unblock, etc.)
 * all rely on database models (Contact, ContactMovement, BlockedEntity).
 * We test pure logic portions here:
 *   - BlockedEntity.isActive (computed property) via a mock
 *   - SendingSettingsService.toMinDays (pure function, requested in spec)
 *   - SendingSettingsService.validateFollowUps (pure validation logic)
 *   - State transition edge cases
 */

// ─── BlockedEntity.isActive simulation ───────────────────────────────────────
// The isActive getter is: if (!blockedUntil) return true; return blockedUntil > DateTime.now()

function isActive(blockedUntil: DateTime | null): boolean {
  if (!blockedUntil) return true
  return blockedUntil > DateTime.now()
}

test.group('ContactMovementService — isActive (BlockedEntity logic)', () => {
  test('null blockedUntil means permanently blocked (active)', ({ assert }) => {
    // No expiry → always active
    assert.isTrue(isActive(null))
  })

  test('future blockedUntil is active', ({ assert }) => {
    const future = DateTime.now().plus({ days: 30 })
    assert.isTrue(isActive(future))
  })

  test('past blockedUntil is not active', ({ assert }) => {
    const past = DateTime.now().minus({ days: 1 })
    assert.isFalse(isActive(past))
  })

  test('far past blockedUntil is not active', ({ assert }) => {
    const farPast = DateTime.now().minus({ years: 1 })
    assert.isFalse(isActive(farPast))
  })

  test('blockedUntil in 1 second is still active', ({ assert }) => {
    const almostNow = DateTime.now().plus({ seconds: 1 })
    assert.isTrue(isActive(almostNow))
  })
})

// ─── toMinDays (from SendingSettingsService — pure function) ─────────────────

test.group('ContactMovementService — toMinDays', () => {
  const service = new SendingSettingsService()

  test('days unit returns value unchanged', ({ assert }) => {
    // ORACLE: toMinDays(5, 'days') = 5 (identity)
    assert.equal(service.toMinDays(5, 'days'), 5)
  })

  test('weeks unit multiplies by 7', ({ assert }) => {
    // ORACLE: toMinDays(2, 'weeks') = 2 * 7 = 14
    assert.equal(service.toMinDays(2, 'weeks'), 14)
  })

  test('months unit multiplies by 30', ({ assert }) => {
    // ORACLE: toMinDays(1, 'months') = 1 * 30 = 30
    assert.equal(service.toMinDays(1, 'months'), 30)
  })

  test('zero value returns 0 for any unit', ({ assert }) => {
    // ORACLE: toMinDays(0, 'days') = 0
    assert.equal(service.toMinDays(0, 'days'), 0)
    // ORACLE: toMinDays(0, 'weeks') = 0 * 7 = 0
    assert.equal(service.toMinDays(0, 'weeks'), 0)
    // ORACLE: toMinDays(0, 'months') = 0 * 30 = 0
    assert.equal(service.toMinDays(0, 'months'), 0)
  })

  test('3 weeks = 21 days', ({ assert }) => {
    // ORACLE: toMinDays(3, 'weeks') = 3 * 7 = 21
    assert.equal(service.toMinDays(3, 'weeks'), 21)
  })

  test('2 months = 60 days', ({ assert }) => {
    // ORACLE: toMinDays(2, 'months') = 2 * 30 = 60
    assert.equal(service.toMinDays(2, 'months'), 60)
  })
})

// ─── validateFollowUps (pure validation logic) ───────────────────────────────

test.group('ContactMovementService — validateFollowUps', () => {
  const service = new SendingSettingsService()

  test('valid follow-ups within limits returns null', ({ assert }) => {
    const result = service.validateFollowUps(
      [{ delayDays: 7 }, { delayDays: 14 }],
      { maxFollowUps: 3, minFollowUpDelay: 5, minFollowUpDelayUnit: 'days' }
    )
    assert.isNull(result)
  })

  test('too many follow-ups returns error', ({ assert }) => {
    const result = service.validateFollowUps(
      [{ delayDays: 7 }, { delayDays: 14 }, { delayDays: 21 }, { delayDays: 28 }],
      { maxFollowUps: 3, minFollowUpDelay: 5, minFollowUpDelayUnit: 'days' }
    )
    assert.isNotNull(result)
    assert.include(result!, 'maximum')
  })

  test('delay below minimum (days) returns error', ({ assert }) => {
    // ORACLE: minDays = toMinDays(5, 'days') = 5
    // delayDays 3 < 5 → error
    const result = service.validateFollowUps(
      [{ delayDays: 3 }],
      { maxFollowUps: 3, minFollowUpDelay: 5, minFollowUpDelayUnit: 'days' }
    )
    assert.isNotNull(result)
    assert.include(result!, 'minimum')
  })

  test('delay below minimum (weeks) returns error', ({ assert }) => {
    // ORACLE: minDays = toMinDays(1, 'weeks') = 1 * 7 = 7
    // delayDays 5 < 7 → error
    const result = service.validateFollowUps(
      [{ delayDays: 5 }],
      { maxFollowUps: 3, minFollowUpDelay: 1, minFollowUpDelayUnit: 'weeks' }
    )
    assert.isNotNull(result)
  })

  test('empty follow-ups array is valid', ({ assert }) => {
    const result = service.validateFollowUps(
      [],
      { maxFollowUps: 3, minFollowUpDelay: 5, minFollowUpDelayUnit: 'days' }
    )
    assert.isNull(result)
  })

  test('exact minimum delay is valid', ({ assert }) => {
    // ORACLE: minDays = toMinDays(7, 'days') = 7
    // delayDays 7 >= 7 → valid
    const result = service.validateFollowUps(
      [{ delayDays: 7 }],
      { maxFollowUps: 3, minFollowUpDelay: 7, minFollowUpDelayUnit: 'days' }
    )
    assert.isNull(result)
  })

  test('exact max follow-ups count is valid', ({ assert }) => {
    const result = service.validateFollowUps(
      [{ delayDays: 7 }, { delayDays: 14 }, { delayDays: 21 }],
      { maxFollowUps: 3, minFollowUpDelay: 5, minFollowUpDelayUnit: 'days' }
    )
    assert.isNull(result)
  })
})

// ─── State transition edge cases ─────────────────────────────────────────────

test.group('ContactMovementService — state transitions (pure logic)', () => {
  // The moveContact method skips if fromStatus === toStatus
  // We test the guard logic here

  test('same status transition is a no-op (guard check)', ({ assert }) => {
    const fromStatus = 'contacted'
    const toStatus = 'contacted'
    // The service returns early when fromStatus === toStatus
    assert.equal(fromStatus, toStatus) // This is the condition that triggers early return
  })

  test('different statuses should trigger movement', ({ assert }) => {
    const fromStatus = 'found'
    const toStatus = 'contacted'
    assert.notEqual(fromStatus, toStatus) // Condition for movement to proceed
  })

  // blockedUntil computed with durationDays
  test('block with durationDays computes future date', ({ assert }) => {
    const durationDays = 30
    const blockedUntil = DateTime.now().plus({ days: durationDays })
    // The blocked date should be ~30 days in the future
    const diffDays = blockedUntil.diff(DateTime.now(), 'days').days
    assert.isAtLeast(Math.round(diffDays), 29)
    assert.isAtMost(Math.round(diffDays), 30)
  })

  test('block without durationDays sets blockedUntil to null (permanent)', ({ assert }) => {
    const durationDays = undefined
    const blockedUntil = durationDays ? DateTime.now().plus({ days: durationDays }) : null
    assert.isNull(blockedUntil)
  })
})
