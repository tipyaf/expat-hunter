/**
 * EmailVerificationService — Send and validate email verification tokens.
 *
 * Token: 64-char hex, 24h expiry, one-time use.
 * Called on registration and on resend request.
 */
import { randomBytes } from 'node:crypto'
import User from '#models/user'
import EmailVerification from '#models/email_verification'
import { DateTime } from 'luxon'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

const TOKEN_BYTES = 32
const TOKEN_EXPIRY_HOURS = 24

export default class EmailVerificationService {
  /**
   * Send a verification email to the user.
   * Invalidates any previous tokens.
   */
  async sendVerification(user: User): Promise<void> {
    // Invalidate previous tokens
    await EmailVerification.query()
      .where('userId', user.id)
      .where('used', false)
      .update({ used: true })

    const token = randomBytes(TOKEN_BYTES).toString('hex')
    await EmailVerification.create({
      userId: user.id,
      token,
      expiresAt: DateTime.now().plus({ hours: TOKEN_EXPIRY_HOURS }),
      used: false,
    })

    const frontendUrl = env.get('FRONTEND_URL', 'http://localhost:3000')
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`

    try {
      await mail.send((message) => {
        message
          .to(user.email)
          .subject('ExpatHunter — Verify your email')
          .htmlView('emails/email_verification', { user, verifyUrl })
          .textView('emails/email_verification_text', { user, verifyUrl })
      })
      logger.info('Verification email sent to %s', user.email)
    } catch (err) {
      logger.error('Failed to send verification email: %s', (err as Error).message)
    }
  }

  /**
   * Verify an email using a token. Returns true if successful.
   */
  async verify(token: string): Promise<boolean> {
    const verification = await EmailVerification.query()
      .where('token', token)
      .where('used', false)
      .preload('user')
      .first()

    if (!verification || !verification.isValid) return false

    // Mark user as verified
    verification.user.emailVerifiedAt = DateTime.now()
    await verification.user.save()

    // Mark token as used
    verification.used = true
    await verification.save()

    logger.info('Email verified for user %s', verification.user.email)
    return true
  }

  /**
   * Resend verification email. Returns false if user is already verified.
   */
  async resend(userId: string): Promise<boolean> {
    const user = await User.find(userId)
    if (!user) return false
    if (user.isEmailVerified) return false

    await this.sendVerification(user)
    return true
  }
}
