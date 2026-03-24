/**
 * PasswordResetService — Generate and validate password reset tokens.
 *
 * Token: 64-char hex (crypto.randomBytes)
 * Expiry: 1 hour
 * One-time use: marked as used after successful reset
 */
import { randomBytes } from 'node:crypto'
import User from '#models/user'
import PasswordReset from '#models/password_reset'
import { DateTime } from 'luxon'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

const TOKEN_BYTES = 32
const TOKEN_EXPIRY_HOURS = 1

export default class PasswordResetService {
  /**
   * Request a password reset. Sends email with reset link.
   * Always returns success (even if email not found) to prevent email enumeration.
   */
  async requestReset(email: string): Promise<void> {
    const user = await User.findBy('email', email.toLowerCase().trim())
    if (!user) {
      logger.info('Password reset requested for unknown email: %s', email)
      return
    }

    // Invalidate any previous tokens for this user
    await PasswordReset.query()
      .where('userId', user.id)
      .where('used', false)
      .update({ used: true })

    // Generate new token
    const token = randomBytes(TOKEN_BYTES).toString('hex')
    await PasswordReset.create({
      userId: user.id,
      token,
      expiresAt: DateTime.now().plus({ hours: TOKEN_EXPIRY_HOURS }),
      used: false,
    })

    // Send email
    const frontendUrl = env.get('FRONTEND_URL', 'http://localhost:3000')
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`

    try {
      await mail.send((message) => {
        message
          .to(user.email)
          .subject('ExpatHunter — Reset your password')
          .htmlView('emails/password_reset', { user, resetUrl, expiryHours: TOKEN_EXPIRY_HOURS })
          .textView('emails/password_reset_text', { user, resetUrl, expiryHours: TOKEN_EXPIRY_HOURS })
      })
      logger.info('Password reset email sent to %s', user.email)
    } catch (err) {
      // Log but don't expose to user — email service might be down
      logger.error('Failed to send password reset email: %s', (err as Error).message)
    }
  }

  /**
   * Validate a reset token. Returns the user if valid, null otherwise.
   */
  async validateToken(token: string): Promise<User | null> {
    const reset = await PasswordReset.query()
      .where('token', token)
      .where('used', false)
      .preload('user')
      .first()

    if (!reset || !reset.isValid) return null
    return reset.user
  }

  /**
   * Reset password using a valid token.
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const reset = await PasswordReset.query()
      .where('token', token)
      .where('used', false)
      .preload('user')
      .first()

    if (!reset || !reset.isValid) return false

    // Update password
    reset.user.password = newPassword
    await reset.user.save()

    // Mark token as used
    reset.used = true
    await reset.save()

    logger.info('Password reset successful for user %s', reset.user.email)
    return true
  }
}
