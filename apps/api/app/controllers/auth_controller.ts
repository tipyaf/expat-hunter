import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { loginValidator, registerValidator } from '#validators/auth_validator'

export default class AuthController {
  async register({ request, response }: HttpContext) {
    const data = await request.validateUsing(registerValidator)

    const existing = await User.findBy('email', data.email)
    if (existing) {
      return response.conflict({ message: 'Email already taken' })
    }

    const user = await User.create({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      locale: data.locale ?? 'en',
    })

    const token = await User.accessTokens.create(user)

    return response.created({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        locale: user.locale,
      },
      token: token.value?.release(),
    })
  }

  async login({ request }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(email, password)
    const token = await User.accessTokens.create(user)

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        locale: user.locale,
      },
      token: token.value?.release(),
    }
  }

  async logout({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const token = user.currentAccessToken
    await User.accessTokens.delete(user, token.identifier)

    return response.ok({ message: 'Logged out successfully' })
  }

  async me({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      locale: user.locale,
      createdAt: user.createdAt,
    }
  }
}
