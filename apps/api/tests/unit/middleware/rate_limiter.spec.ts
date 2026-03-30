import { test } from '@japa/runner'
import {
  LOGIN_RATE_LIMIT,
  LOGIN_RATE_WINDOW_SECONDS,
  REGISTER_RATE_LIMIT,
  REGISTER_RATE_WINDOW_SECONDS,
  FORGOT_PASSWORD_RATE_LIMIT,
  FORGOT_PASSWORD_RATE_WINDOW_SECONDS,
  MAX_FAILED_LOGINS,
  LOCKOUT_DURATION_MINUTES,
  RATE_LIMIT_PREFIX,
  LOCKOUT_PREFIX,
} from '#constants/auth'

test.group('Auth constants', () => {
  test('LOGIN_RATE_LIMIT is 10 requests', ({ assert }) => {
    assert.equal(LOGIN_RATE_LIMIT, 10)
  })

  test('LOGIN_RATE_WINDOW_SECONDS is 60 (1 minute)', ({ assert }) => {
    assert.equal(LOGIN_RATE_WINDOW_SECONDS, 60)
  })

  test('REGISTER_RATE_LIMIT is 5 requests', ({ assert }) => {
    assert.equal(REGISTER_RATE_LIMIT, 5)
  })

  test('REGISTER_RATE_WINDOW_SECONDS is 3600 (1 hour)', ({ assert }) => {
    assert.equal(REGISTER_RATE_WINDOW_SECONDS, 3600)
  })

  test('FORGOT_PASSWORD_RATE_LIMIT is 3 requests', ({ assert }) => {
    assert.equal(FORGOT_PASSWORD_RATE_LIMIT, 3)
  })

  test('FORGOT_PASSWORD_RATE_WINDOW_SECONDS is 3600 (1 hour)', ({ assert }) => {
    assert.equal(FORGOT_PASSWORD_RATE_WINDOW_SECONDS, 3600)
  })

  test('MAX_FAILED_LOGINS is 5', ({ assert }) => {
    assert.equal(MAX_FAILED_LOGINS, 5)
  })

  test('LOCKOUT_DURATION_MINUTES is 15', ({ assert }) => {
    assert.equal(LOCKOUT_DURATION_MINUTES, 15)
  })

  test('RATE_LIMIT_PREFIX is defined', ({ assert }) => {
    assert.isString(RATE_LIMIT_PREFIX)
    assert.isNotEmpty(RATE_LIMIT_PREFIX)
  })

  test('LOCKOUT_PREFIX is defined', ({ assert }) => {
    assert.isString(LOCKOUT_PREFIX)
    assert.isNotEmpty(LOCKOUT_PREFIX)
  })

  test('all rate limits are positive integers', ({ assert }) => {
    assert.isAbove(LOGIN_RATE_LIMIT, 0)
    assert.isAbove(REGISTER_RATE_LIMIT, 0)
    assert.isAbove(FORGOT_PASSWORD_RATE_LIMIT, 0)
    assert.isAbove(MAX_FAILED_LOGINS, 0)
    assert.isAbove(LOCKOUT_DURATION_MINUTES, 0)
  })
})
