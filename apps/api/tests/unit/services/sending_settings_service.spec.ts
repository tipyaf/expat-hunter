import { test } from '@japa/runner'
import SendingSettingsService from '#services/sending_settings_service'
import type { AdminEmailLimits } from '#services/sending_settings_service'

test.group('SendingSettingsService — toMinDays', () => {
  const service = new SendingSettingsService()

  test('converts days to days (identity)', async ({ assert }) => {
    assert.equal(service.toMinDays(5, 'days'), 5) // ORACLE: 5 days = 5
  })

  test('converts weeks to days', async ({ assert }) => {
    assert.equal(service.toMinDays(3, 'weeks'), 21) // ORACLE: 3 * 7 = 21
  })

  test('converts months to days', async ({ assert }) => {
    assert.equal(service.toMinDays(2, 'months'), 60) // ORACLE: 2 * 30 = 60
  })

  test('converts 1 week to 7 days', async ({ assert }) => {
    assert.equal(service.toMinDays(1, 'weeks'), 7) // ORACLE: 1 * 7 = 7
  })

  test('converts 1 month to 30 days', async ({ assert }) => {
    assert.equal(service.toMinDays(1, 'months'), 30) // ORACLE: 1 * 30 = 30
  })
})

test.group('SendingSettingsService — validateFollowUps', () => {
  const service = new SendingSettingsService()

  test('returns null when follow-ups are within limits', async ({ assert }) => {
    const limits: AdminEmailLimits = {
      maxFollowUps: 3,
      minFollowUpDelay: 1,
      minFollowUpDelayUnit: 'weeks',
    }
    const followUps = [
      { delayDays: 7 },
      { delayDays: 14 },
    ]
    const result = service.validateFollowUps(followUps, limits)
    assert.isNull(result)
  })

  test('returns error when too many follow-ups', async ({ assert }) => {
    const limits: AdminEmailLimits = {
      maxFollowUps: 2,
      minFollowUpDelay: 1,
      minFollowUpDelayUnit: 'days',
    }
    const followUps = [
      { delayDays: 3 },
      { delayDays: 7 },
      { delayDays: 14 },
    ]
    const result = service.validateFollowUps(followUps, limits)
    assert.isNotNull(result)
    assert.include(result!, '2') // max is 2
  })

  test('returns error when delay is below minimum (weeks)', async ({ assert }) => {
    const limits: AdminEmailLimits = {
      maxFollowUps: 3,
      minFollowUpDelay: 2,
      minFollowUpDelayUnit: 'weeks',
    }
    // ORACLE: minDays = 2 * 7 = 14
    const followUps = [
      { delayDays: 10 }, // 10 < 14 → invalid
    ]
    const result = service.validateFollowUps(followUps, limits)
    assert.isNotNull(result)
    assert.include(result!, '2')
    assert.include(result!, 'weeks')
  })

  test('returns null when delay exactly matches minimum', async ({ assert }) => {
    const limits: AdminEmailLimits = {
      maxFollowUps: 3,
      minFollowUpDelay: 1,
      minFollowUpDelayUnit: 'weeks',
    }
    // ORACLE: minDays = 1 * 7 = 7
    const followUps = [
      { delayDays: 7 }, // exactly 7 = 7 → valid
    ]
    const result = service.validateFollowUps(followUps, limits)
    assert.isNull(result)
  })

  test('returns error when any follow-up violates delay (not just first)', async ({ assert }) => {
    const limits: AdminEmailLimits = {
      maxFollowUps: 3,
      minFollowUpDelay: 1,
      minFollowUpDelayUnit: 'months',
    }
    // ORACLE: minDays = 1 * 30 = 30
    const followUps = [
      { delayDays: 30 }, // ok
      { delayDays: 14 }, // 14 < 30 → invalid
    ]
    const result = service.validateFollowUps(followUps, limits)
    assert.isNotNull(result)
  })

  test('empty follow-ups array is valid', async ({ assert }) => {
    const limits: AdminEmailLimits = {
      maxFollowUps: 3,
      minFollowUpDelay: 1,
      minFollowUpDelayUnit: 'days',
    }
    const result = service.validateFollowUps([], limits)
    assert.isNull(result)
  })
})
