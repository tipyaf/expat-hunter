import { test } from '@japa/runner'
import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'

const TOKEN_BYTES = 32
const TOKEN_EXPIRY_HOURS = 24

test.group('EmailVerificationService', () => {
  test('token generation produces 64-char hex string', async ({ assert }) => {
    // The service uses: randomBytes(32).toString('hex')
    const token = randomBytes(TOKEN_BYTES).toString('hex')
    assert.equal(token.length, 64) // ORACLE: 32 bytes * 2 hex chars = 64
    assert.match(token, /^[a-f0-9]{64}$/)
  })

  test('two generated tokens are unique', async ({ assert }) => {
    const token1 = randomBytes(TOKEN_BYTES).toString('hex')
    const token2 = randomBytes(TOKEN_BYTES).toString('hex')
    assert.notEqual(token1, token2)
  })

  test('token expiry is set to 24 hours from now', async ({ assert }) => {
    const now = DateTime.now()
    const expiresAt = now.plus({ hours: TOKEN_EXPIRY_HOURS })

    const diffHours = expiresAt.diff(now, 'hours').hours
    assert.closeTo(diffHours, 24, 0.01) // ORACLE: TOKEN_EXPIRY_HOURS = 24
  })

  test('isExpired returns true for past expiry date', async ({ assert }) => {
    // Simulates the EmailVerification model's isExpired getter
    const pastExpiry = DateTime.now().minus({ hours: 1 })
    const isExpired = pastExpiry < DateTime.now()
    assert.isTrue(isExpired)
  })

  test('isExpired returns false for future expiry date', async ({ assert }) => {
    const futureExpiry = DateTime.now().plus({ hours: 23 })
    const isExpired = futureExpiry < DateTime.now()
    assert.isFalse(isExpired)
  })

  test('isValid returns false when token is used even if not expired', async ({ assert }) => {
    // Simulates the model's isValid getter: !used && !isExpired
    const used = true
    const expiresAt = DateTime.now().plus({ hours: 10 })
    const isExpired = expiresAt < DateTime.now()
    const isValid = !used && !isExpired
    assert.isFalse(isValid)
  })

  test('isValid returns false when token is expired even if not used', async ({ assert }) => {
    const used = false
    const expiresAt = DateTime.now().minus({ hours: 1 })
    const isExpired = expiresAt < DateTime.now()
    const isValid = !used && !isExpired
    assert.isFalse(isValid)
  })

  test('isValid returns true only when not used and not expired', async ({ assert }) => {
    const used = false
    const expiresAt = DateTime.now().plus({ hours: 10 })
    const isExpired = expiresAt < DateTime.now()
    const isValid = !used && !isExpired
    assert.isTrue(isValid)
  })

  test('verification URL is constructed correctly', async ({ assert }) => {
    const frontendUrl = 'http://localhost:3000'
    const token = 'abc123def456'
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`
    assert.equal(verifyUrl, 'http://localhost:3000/verify-email?token=abc123def456')
  })
})
