import { TEST_USER_PASSWORD } from '#tests/helpers/credentials'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import User from '#models/user'

const BASE_URL = '/api/auth'

const validUser = {
  email: 'test@example.com',
  password: TEST_USER_PASSWORD,
  fullName: 'Test User',
}

test.group('POST /api/auth/register', (group) => {
  group.each.setup(async () => {
    await db.from('auth_access_tokens').delete()
    await db.from('users').delete()
  })

  test('should register a new user and return 201 with user and token', async ({
    client,
    assert,
  }) => {
    const response = await client.post(`${BASE_URL}/register`).json(validUser)

    response.assertStatus(201)
    assert.exists(response.body().user)
    assert.exists(response.body().token)
    assert.equal(response.body().user.email, validUser.email)
    assert.equal(response.body().user.fullName, validUser.fullName)
    assert.exists(response.body().user.id)
    assert.equal(response.body().user.locale, 'en')
  })

  test('should return 422 when email is missing', async ({ client }) => {
    const response = await client.post(`${BASE_URL}/register`).json({
      password: TEST_USER_PASSWORD,
      fullName: 'Test User',
    })

    response.assertStatus(422)
  })

  test('should return 422 when password is too short', async ({ client }) => {
    const response = await client.post(`${BASE_URL}/register`).json({
      email: 'test@example.com',
      password: 'short',
      fullName: 'Test User',
    })

    response.assertStatus(422)
  })

  test('should return 422 when fullName is missing', async ({ client }) => {
    const response = await client.post(`${BASE_URL}/register`).json({
      email: 'test@example.com',
      password: TEST_USER_PASSWORD,
    })

    response.assertStatus(422)
  })

  test('should return 409 when email is already taken', async ({ client }) => {
    await client.post(`${BASE_URL}/register`).json(validUser)

    const response = await client.post(`${BASE_URL}/register`).json(validUser)

    response.assertStatus(409)
  })

  test('should return a valid token that works on /me', async ({ client }) => {
    const registerResponse = await client.post(`${BASE_URL}/register`).json(validUser)

    registerResponse.assertStatus(201)
    const token = registerResponse.body().token

    const meResponse = await client.get(`${BASE_URL}/me`).header('Authorization', `Bearer ${token}`)

    meResponse.assertStatus(200)
    meResponse.assertBodyContains({ email: validUser.email })
  })
})

test.group('POST /api/auth/login', (group) => {
  group.each.setup(async () => {
    await db.from('auth_access_tokens').delete()
    await db.from('users').delete()
    // Create a user for login tests
    await User.create({
      email: validUser.email,
      password: validUser.password,
      fullName: validUser.fullName,
      locale: 'en',
    })
  })

  test('should login with correct credentials and return 200 with user and token', async ({
    client,
    assert,
  }) => {
    const response = await client.post(`${BASE_URL}/login`).json({
      email: validUser.email,
      password: validUser.password,
    })

    response.assertStatus(200)
    assert.exists(response.body().user)
    assert.exists(response.body().token)
    assert.equal(response.body().user.email, validUser.email)
    assert.equal(response.body().user.fullName, validUser.fullName)
  })

  test('should return 400 with wrong password', async ({ client }) => {
    const response = await client.post(`${BASE_URL}/login`).json({
      email: validUser.email,
      password: 'wrongpassword',
    })

    response.assertStatus(400)
  })

  test('should return 400 with non-existent email', async ({ client }) => {
    const response = await client.post(`${BASE_URL}/login`).json({
      email: 'nonexistent@example.com',
      password: TEST_USER_PASSWORD,
    })

    response.assertStatus(400)
  })

  test('should return a valid token that works on /me', async ({ client }) => {
    const loginResponse = await client.post(`${BASE_URL}/login`).json({
      email: validUser.email,
      password: validUser.password,
    })

    loginResponse.assertStatus(200)
    const token = loginResponse.body().token

    const meResponse = await client.get(`${BASE_URL}/me`).header('Authorization', `Bearer ${token}`)

    meResponse.assertStatus(200)
    meResponse.assertBodyContains({ email: validUser.email })
  })
})

test.group('POST /api/auth/logout', (group) => {
  group.each.setup(async () => {
    await db.from('auth_access_tokens').delete()
    await db.from('users').delete()
  })

  test('should logout successfully and return 200', async ({ client }) => {
    const registerResponse = await client.post(`${BASE_URL}/register`).json(validUser)
    const token = registerResponse.body().token

    const response = await client
      .post(`${BASE_URL}/logout`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    response.assertBodyContains({ message: 'Logged out successfully' })
  })

  test('should return 401 without a token', async ({ client }) => {
    const response = await client.post(`${BASE_URL}/logout`)

    response.assertStatus(401)
  })

  test('should invalidate the token after logout', async ({ client }) => {
    const registerResponse = await client.post(`${BASE_URL}/register`).json(validUser)
    const token = registerResponse.body().token

    // Logout
    await client.post(`${BASE_URL}/logout`).header('Authorization', `Bearer ${token}`)

    // Try to use the token again
    const meResponse = await client.get(`${BASE_URL}/me`).header('Authorization', `Bearer ${token}`)

    meResponse.assertStatus(401)
  })
})

test.group('GET /api/auth/me', (group) => {
  group.each.setup(async () => {
    await db.from('auth_access_tokens').delete()
    await db.from('users').delete()
  })

  test('should return user data with a valid token', async ({ client, assert }) => {
    const registerResponse = await client.post(`${BASE_URL}/register`).json(validUser)
    const token = registerResponse.body().token

    const response = await client.get(`${BASE_URL}/me`).header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.exists(response.body().id)
    assert.equal(response.body().email, validUser.email)
    assert.equal(response.body().fullName, validUser.fullName)
    assert.equal(response.body().locale, 'en')
    assert.exists(response.body().createdAt)
  })

  test('should return 401 without a token', async ({ client }) => {
    const response = await client.get(`${BASE_URL}/me`)

    response.assertStatus(401)
  })

  test('should return 401 with an invalid token', async ({ client }) => {
    const response = await client
      .get(`${BASE_URL}/me`)
      .header('Authorization', 'Bearer invalidtoken123')

    response.assertStatus(401)
  })
})
