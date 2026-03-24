import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { loginValidator, registerValidator } from '#validators/auth_validator'
import PasswordResetService from '#services/password_reset_service'
import EmailVerificationService from '#services/email_verification_service'

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

    // Send verification email (non-blocking)
    const verificationService = new EmailVerificationService()
    verificationService.sendVerification(user).catch(() => {})

    return response.created({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        locale: user.locale,
        isAdmin: user.isAdmin ?? false,
        emailVerified: false,
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
        isAdmin: user.isAdmin ?? false,
        emailVerified: user.isEmailVerified,
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
      isAdmin: user.isAdmin ?? false,
      emailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    }
  }

  async verifyEmail({ request, response }: HttpContext) {
    const { token } = request.only(['token'])
    if (!token || typeof token !== 'string') {
      return response.badRequest({ error: { code: 'TOKEN_REQUIRED', message: 'Verification token is required' } })
    }

    const service = new EmailVerificationService()
    const success = await service.verify(token)

    if (!success) {
      return response.badRequest({ error: { code: 'TOKEN_INVALID', message: 'Invalid or expired verification token' } })
    }

    return response.ok({ message: 'Email verified successfully' })
  }

  async resendVerification({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    if (user.isEmailVerified) {
      return response.ok({ message: 'Email is already verified' })
    }

    const service = new EmailVerificationService()
    await service.resend(user.id)

    return response.ok({ message: 'Verification email sent' })
  }

  async forgotPassword({ request, response }: HttpContext) {
    const { email } = request.only(['email'])
    if (!email || typeof email !== 'string') {
      return response.badRequest({ error: { code: 'EMAIL_REQUIRED', message: 'Email is required' } })
    }

    const service = new PasswordResetService()
    await service.requestReset(email)

    // Always return success to prevent email enumeration
    return response.ok({ message: 'If an account with this email exists, a reset link has been sent.' })
  }

  async resetPassword({ request, response }: HttpContext) {
    const { token, password } = request.only(['token', 'password'])

    if (!token || typeof token !== 'string') {
      return response.badRequest({ error: { code: 'TOKEN_REQUIRED', message: 'Reset token is required' } })
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return response.badRequest({ error: { code: 'PASSWORD_INVALID', message: 'Password must be at least 8 characters' } })
    }

    const service = new PasswordResetService()
    const success = await service.resetPassword(token, password)

    if (!success) {
      return response.badRequest({ error: { code: 'TOKEN_INVALID', message: 'Invalid or expired reset token' } })
    }

    return response.ok({ message: 'Password has been reset successfully' })
  }
}
