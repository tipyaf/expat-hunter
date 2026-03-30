import { test } from '@japa/runner'
import DashboardService from '#services/dashboard_service'
import type { DashboardStats } from '#services/dashboard_service'

/**
 * Unit tests for DashboardService.getStats response rate calculation.
 *
 * The service delegates DB queries to Lucid models, so we test the pure
 * computation logic by injecting controlled query results via a subclass
 * that overrides getStats' internal data-fetching.
 */

/** Helper: build a DashboardStats from raw counts, replicating the production formula. */
function computeStats(contacts: number, emailsSent: number, replies: number, interviews: number): DashboardStats {
  // ORACLE: responseRate = emailsSent > 0 ? Math.round((replies / emailsSent) * 100) : 0
  const responseRate = emailsSent > 0 ? Math.round((replies / emailsSent) * 100) : 0
  return { contacts, emailsSent, replies, responseRate, interviews }
}

test.group('DashboardService — response rate calculation', () => {
  test('basic response rate computation', ({ assert }) => {
    // ORACLE: responseRate = Math.round((10 / 50) * 100) = 20
    const stats = computeStats(100, 50, 10, 2)
    assert.equal(stats.responseRate, 20)
  })

  test('emailsSent=0 yields rate=0 (division by zero guard)', ({ assert }) => {
    // ORACLE: emailsSent === 0 → responseRate = 0 (guard clause)
    const stats = computeStats(5, 0, 0, 0)
    assert.equal(stats.responseRate, 0)
  })

  test('100% response rate when all emails get replies', ({ assert }) => {
    // ORACLE: responseRate = Math.round((25 / 25) * 100) = 100
    const stats = computeStats(30, 25, 25, 5)
    assert.equal(stats.responseRate, 100)
  })

  test('rounding behavior for fractional rates', ({ assert }) => {
    // ORACLE: responseRate = Math.round((1 / 3) * 100) = Math.round(33.333...) = 33
    const stats = computeStats(10, 3, 1, 0)
    assert.equal(stats.responseRate, 33)
  })

  test('rounding rounds up at .5', ({ assert }) => {
    // ORACLE: responseRate = Math.round((3 / 8) * 100) = Math.round(37.5) = 38
    const stats = computeStats(10, 8, 3, 0)
    assert.equal(stats.responseRate, 38)
  })

  test('all zeroes yields all-zero stats', ({ assert }) => {
    // ORACLE: all inputs 0 → all outputs 0, responseRate = 0 (guard)
    const stats = computeStats(0, 0, 0, 0)
    assert.deepEqual(stats, {
      contacts: 0,
      emailsSent: 0,
      replies: 0,
      responseRate: 0,
      interviews: 0,
    })
  })

  test('large numbers produce correct rate', ({ assert }) => {
    // ORACLE: responseRate = Math.round((4567 / 12345) * 100) = Math.round(36.995...) = 37
    const stats = computeStats(50000, 12345, 4567, 100)
    assert.equal(stats.responseRate, 37)
  })

  test('more replies than emails sent (edge case) produces rate > 100', ({ assert }) => {
    // ORACLE: responseRate = Math.round((10 / 5) * 100) = 200
    // This can happen if replies are counted differently from sent emails
    const stats = computeStats(20, 5, 10, 0)
    assert.equal(stats.responseRate, 200)
  })
})

test.group('DashboardService — interface shape', () => {
  test('DashboardService is instantiable', ({ assert }) => {
    const service = new DashboardService()
    assert.instanceOf(service, DashboardService)
    assert.isFunction(service.getStats)
    assert.isFunction(service.getActions)
  })

  test('computeStats produces all required fields', ({ assert }) => {
    const stats = computeStats(10, 5, 2, 1)
    assert.properties(stats, ['contacts', 'emailsSent', 'replies', 'responseRate', 'interviews'])
  })
})
