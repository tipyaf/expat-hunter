import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import PasswordReset from '#models/password_reset'
import User from '#models/user'
import PasswordResetService from '#services/password_reset_service'

const TEST_USER = {
  email: 'reset-unit@example.com',
  password: 'password123',
  fullName: 'Reset Test User',
  locale: 'en',
}

test.group('PasswordResetService', (group) => {
  let fakeMail: ReturnType<typeof mail.fake>

  group.each.setup(async () => {
    fakeMail = mail.fake()
    await db.from('password_resets').delete()
    await db.from('auth_access_tokens').delete()
    await db.from('users').delete()
  })

  group.each.teardown(() => {
    mail.restore()
  })

  // ---------------------------------------------------------------------------
  // requestReset
  // ---------------------------------------------------------------------------

  test('requestReset — creates a token in DB for an existing user', async ({ assert }) => {
    await User.create(TEST_USER)
    const service = new PasswordResetService()

    await service.requestReset(TEST_USER.email)

    const reset = await PasswordReset.query()
      .whereHas('user', (q) => q.where('email', TEST_USER.email))
      .first()

    assert.exists(reset)
    assert.isFalse(reset!.used)
    assert.isTrue(reset!.expiresAt > DateTime.now())
    assert.lengthOf(reset!.token, 64) // 32 bytes hex = 64 chars
  })

  test('requestReset — invalidates previous tokens before creating a new one', async ({
    assert,
  }) => {
    const user = await User.create(TEST_USER)
    await PasswordReset.create({
      userId: user.id,
      token: 'oldtoken'.padEnd(64, '0'),
      expiresAt: DateTime.now().plus({ hours: 1 }),
      used: false,
    })

    const service = new PasswordResetService()
    await service.requestReset(TEST_USER.email)

    const resets = await PasswordReset.query().whereHas('user', (q) =>
      q.where('email', TEST_USER.email)
    )

    const unusedResets = resets.filter((r) => !r.used)
    assert.lengthOf(unusedResets, 1) // only the new one is unused
  })

  test('requestReset — does nothing silently for unknown email', async ({ assert }) => {
    const service = new PasswordResetService()

    await service.requestReset('unknown@nowhere.test')

    const count = await db.from('password_resets').count('* as total')
    assert.equal(Number(count[0].total), 0)
  })

  test('requestReset — is case-insensitive and trims email', async ({ assert }) => {
    await User.create(TEST_USER)
    const service = new PasswordResetService()

    await service.requestReset('  RESET-UNIT@EXAMPLE.COM  ')

    const reset = await PasswordReset.query().first()
    assert.exists(reset)
  })

  test('requestReset — sends a reset email to the user', async () => {
    await User.create(TEST_USER)
    const service = new PasswordResetService()

    await service.requestReset(TEST_USER.email)

    fakeMail.messages.assertSentCount(1)
    fakeMail.messages.assertSent({ to: TEST_USER.email })
  })

  test('requestReset — does not send email for unknown address', async () => {
    const service = new PasswordResetService()

    await service.requestReset('nobody@nowhere.test')

    fakeMail.messages.assertNoneSent()
  })

  // ---------------------------------------------------------------------------
  // validateToken
  // ---------------------------------------------------------------------------

  test('validateToken — returns the user for a valid token', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const token = 'a'.repeat(64)
    await PasswordReset.create({
      userId: user.id,
      token,
      expiresAt: DateTime.now().plus({ hours: 1 }),
      used: false,
    })

    const service = new PasswordResetService()
    const result = await service.validateToken(token)

    assert.exists(result)
    assert.equal(result!.email, TEST_USER.email)
  })

  test('validateToken — returns null for an unknown token', async ({ assert }) => {
    const service = new PasswordResetService()
    const result = await service.validateToken('b'.repeat(64))

    assert.isNull(result)
  })

  test('validateToken — returns null for an already used token', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const token = 'c'.repeat(64)
    await PasswordReset.create({
      userId: user.id,
      token,
      expiresAt: DateTime.now().plus({ hours: 1 }),
      used: true,
    })

    const service = new PasswordResetService()
    const result = await service.validateToken(token)

    assert.isNull(result)
  })

  test('validateToken — returns null for an expired token', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const token = 'd'.repeat(64)
    await PasswordReset.create({
      userId: user.id,
      token,
      expiresAt: DateTime.now().minus({ hours: 1 }),
      used: false,
    })

    const service = new PasswordResetService()
    const result = await service.validateToken(token)

    assert.isNull(result)
  })

  // ---------------------------------------------------------------------------
  // resetPassword
  // ---------------------------------------------------------------------------

  test('resetPassword — updates the password and marks token as used', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const token = 'e'.repeat(64)
    await PasswordReset.create({
      userId: user.id,
      token,
      expiresAt: DateTime.now().plus({ hours: 1 }),
      used: false,
    })

    const service = new PasswordResetService()
    const success = await service.resetPassword(token, 'NewPassword456!')

    assert.isTrue(success)

    // Token is now marked used
    const reset = await PasswordReset.findByOrFail('token', token)
    assert.isTrue(reset.used)

    // User can now login with the new password
    const updatedUser = await User.verifyCredentials(TEST_USER.email, 'NewPassword456!')
    assert.exists(updatedUser)
  })

  test('resetPassword — returns false for an invalid token', async ({ assert }) => {
    const service = new PasswordResetService()
    const success = await service.resetPassword('f'.repeat(64), 'NewPassword456!')

    assert.isFalse(success)
  })

  test('resetPassword — returns false for an expired token', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const token = 'g'.repeat(64)
    await PasswordReset.create({
      userId: user.id,
      token,
      expiresAt: DateTime.now().minus({ minutes: 1 }),
      used: false,
    })

    const service = new PasswordResetService()
    const success = await service.resetPassword(token, 'NewPassword456!')

    assert.isFalse(success)
  })

  test('resetPassword — returns false when token is already used', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const token = 'h'.repeat(64)
    await PasswordReset.create({
      userId: user.id,
      token,
      expiresAt: DateTime.now().plus({ hours: 1 }),
      used: true,
    })

    const service = new PasswordResetService()
    const success = await service.resetPassword(token, 'NewPassword456!')

    assert.isFalse(success)
  })

  test('resetPassword — used token cannot be reused', async ({ assert }) => {
    const user = await User.create(TEST_USER)
    const token = 'i'.repeat(64)
    await PasswordReset.create({
      userId: user.id,
      token,
      expiresAt: DateTime.now().plus({ hours: 1 }),
      used: false,
    })

    const service = new PasswordResetService()
    await service.resetPassword(token, 'FirstNew456!')

    const secondAttempt = await service.resetPassword(token, 'SecondNew789!')
    assert.isFalse(secondAttempt)
  })
})
