import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import PasswordReset from '#models/password_reset'
import User from '#models/user'

const BASE_URL = '/api/auth'

const TEST_USER = {
  email: 'reset-func@example.com',
  password: 'password123',
  fullName: 'Reset Functional User',
  locale: 'en',
}

test.group('POST /api/auth/forgot-password', (group) => {
  let fakeMail: ReturnType<typeof mail.fake>

  group.each.setup(async () => {
    fakeMail = mail.fake()
    await db.from('password_resets').delete()
    await db.from('auth_access_tokens').delete()
    await db.from('users').delete()
    await User.create(TEST_USER)
  })

  group.each.teardown(() => {
    mail.restore()
  })

  test('returns 200 for an existing email', async ({ client }) => {
    const response = await client
      .post(`${BASE_URL}/forgot-password`)
      .json({ email: TEST_USER.email })

    response.assertStatus(200)
  })

  test('returns 200 for an unknown email (anti-enumeration)', async ({ client }) => {
    const response = await client
      .post(`${BASE_URL}/forgot-password`)
      .json({ email: 'nobody@nowhere.test' })

    response.assertStatus(200)
  })

  test('creates a reset token in DB for existing user', async ({ client, assert }) => {
    await client.post(`${BASE_URL}/forgot-password`).json({ email: TEST_USER.email })

    const reset = await PasswordReset.query()
      .whereHas('user', (q) => q.where('email', TEST_USER.email))
      .first()

    assert.exists(reset)
    assert.isFalse(reset!.used)
    assert.isTrue(reset!.expiresAt > DateTime.now())
  })

  test('does NOT create a token in DB for unknown email', async ({ client, assert }) => {
    await client
      .post(`${BASE_URL}/forgot-password`)
      .json({ email: 'nobody@nowhere.test' })

    const count = await db.from('password_resets').count('* as total')
    assert.equal(Number(count[0].total), 0)
  })

  test('sends a reset email to the user', async ({ client }) => {
    await client.post(`${BASE_URL}/forgot-password`).json({ email: TEST_USER.email })

    fakeMail.messages.assertSentCount(1)
    fakeMail.messages.assertSent({ to: TEST_USER.email })
  })

  test('does not send email for unknown address (anti-enumeration)', async ({ client }) => {
    await client.post(`${BASE_URL}/forgot-password`).json({ email: 'nobody@nowhere.test' })

    fakeMail.messages.assertNoneSent()
  })

  test('returns 400 when email is missing', async ({ client }) => {
    const response = await client.post(`${BASE_URL}/forgot-password`).json({})

    response.assertStatus(400)
  })
})

test.group('POST /api/auth/reset-password', (group) => {
  group.each.setup(async () => {
    mail.fake()
    await db.from('password_resets').delete()
    await db.from('auth_access_tokens').delete()
    await db.from('users').delete()
  })

  group.each.teardown(() => {
    mail.restore()
  })

  async function createUserWithToken(
    token: string,
    overrides: { used?: boolean; expiresAt?: DateTime } = {},
  ) {
    const user = await User.create(TEST_USER)
    await PasswordReset.create({
      userId: user.id,
      token,
      expiresAt: overrides.expiresAt ?? DateTime.now().plus({ hours: 1 }),
      used: overrides.used ?? false,
    })
    return user
  }

  test('returns 200 and resets password with a valid token', async ({ client }) => {
    const token = 'v'.repeat(64)
    await createUserWithToken(token)

    const response = await client
      .post(`${BASE_URL}/reset-password`)
      .json({ token, password: 'NewPassword456!' })

    response.assertStatus(200)
  })

  test('user can login with new password after reset', async ({ client, assert }) => {
    const token = 'w'.repeat(64)
    await createUserWithToken(token)

    await client
      .post(`${BASE_URL}/reset-password`)
      .json({ token, password: 'NewPassword456!' })

    const loginResponse = await client
      .post(`${BASE_URL}/login`)
      .json({ email: TEST_USER.email, password: 'NewPassword456!' })

    loginResponse.assertStatus(200)
    assert.exists(loginResponse.body().token)
  })

  test('old password no longer works after reset', async ({ client }) => {
    const token = 'x'.repeat(64)
    await createUserWithToken(token)

    await client
      .post(`${BASE_URL}/reset-password`)
      .json({ token, password: 'NewPassword456!' })

    const loginResponse = await client
      .post(`${BASE_URL}/login`)
      .json({ email: TEST_USER.email, password: TEST_USER.password })

    loginResponse.assertStatus(400)
  })

  test('returns 400 for an invalid token', async ({ client }) => {
    const response = await client
      .post(`${BASE_URL}/reset-password`)
      .json({ token: 'z'.repeat(64), password: 'NewPassword456!' })

    response.assertStatus(400)
  })

  test('returns 400 for an expired token', async ({ client }) => {
    const token = 'a'.repeat(64)
    await createUserWithToken(token, { expiresAt: DateTime.now().minus({ hours: 2 }) })

    const response = await client
      .post(`${BASE_URL}/reset-password`)
      .json({ token, password: 'NewPassword456!' })

    response.assertStatus(400)
  })

  test('returns 400 for an already used token', async ({ client }) => {
    const token = 'b'.repeat(64)
    await createUserWithToken(token, { used: true })

    const response = await client
      .post(`${BASE_URL}/reset-password`)
      .json({ token, password: 'NewPassword456!' })

    response.assertStatus(400)
  })

  test('returns 400 when token is missing', async ({ client }) => {
    const response = await client
      .post(`${BASE_URL}/reset-password`)
      .json({ password: 'NewPassword456!' })

    response.assertStatus(400)
  })

  test('returns 400 when password is too short (less than 8 chars)', async ({ client }) => {
    const token = 'c'.repeat(64)
    await createUserWithToken(token)

    const response = await client
      .post(`${BASE_URL}/reset-password`)
      .json({ token, password: 'short' })

    response.assertStatus(400)
  })

  test('token cannot be reused after a successful reset', async ({ client }) => {
    const token = 'd'.repeat(64)
    await createUserWithToken(token)

    await client
      .post(`${BASE_URL}/reset-password`)
      .json({ token, password: 'NewPassword456!' })

    const secondAttempt = await client
      .post(`${BASE_URL}/reset-password`)
      .json({ token, password: 'AnotherPassword789!' })

    secondAttempt.assertStatus(400)
  })
})
