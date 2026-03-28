import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import EmailConnection, { CONNECTION_TYPE, OAUTH_PROVIDER } from '#models/email_connection'
import logger from '@adonisjs/core/services/logger'

export default class EmailOAuthController {
  /**
   * GET /api/email-connections/oauth/google
   * Redirect user to Google OAuth consent for Gmail access.
   */
  async googleRedirect({ ally }: HttpContext) {
    return ally.use('googleMail').redirect()
  }

  /**
   * GET /api/email-connections/oauth/google/callback
   * Handle Google OAuth callback — store tokens in email_connections.
   */
  async googleCallback({ ally, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const google = ally.use('googleMail')
    const frontendUrl = env.get('FRONTEND_URL')
    const settingsPath = '/parametres/connexion-email'

    if (google.accessDenied()) {
      logger.warn({ userId: user.id }, 'Google email OAuth: access denied')
      return response.redirect(`${frontendUrl}${settingsPath}?oauth=error&reason=access_denied`)
    }

    if (google.stateMisMatch()) {
      logger.warn({ userId: user.id }, 'Google email OAuth: state mismatch')
      return response.redirect(`${frontendUrl}${settingsPath}?oauth=error&reason=state_mismatch`)
    }

    if (google.hasError()) {
      logger.error({ userId: user.id }, 'Google email OAuth: unknown error')
      return response.redirect(`${frontendUrl}${settingsPath}?oauth=error&reason=oauth_failed`)
    }

    const googleUser = await google.user()

    // Upsert: one connection per user
    let connection = await EmailConnection.findBy('userId', user.id)

    if (connection) {
      connection.connectionType = CONNECTION_TYPE.OAUTH
      connection.oauthProvider = OAUTH_PROVIDER.GOOGLE
      connection.oauthAccessToken = googleUser.token.token
      connection.oauthRefreshToken = googleUser.token.refreshToken ?? connection.oauthRefreshToken
      connection.oauthExpiresAt = googleUser.token.expiresAt
      connection.oauthEmail = googleUser.email ?? null
      connection.isActive = true
      await connection.save()
    } else {
      connection = await EmailConnection.create({
        userId: user.id,
        connectionType: CONNECTION_TYPE.OAUTH,
        oauthProvider: OAUTH_PROVIDER.GOOGLE,
        oauthAccessToken: googleUser.token.token,
        oauthRefreshToken: googleUser.token.refreshToken,
        oauthExpiresAt: googleUser.token.expiresAt,
        oauthEmail: googleUser.email ?? null,
        isActive: true,
        // Manual fields set to empty defaults
        imapHost: '',
        imapPort: 993,
        imapUser: '',
        imapPassword: '',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: googleUser.email ?? '',
        smtpPassword: '',
      })
    }

    logger.info({ userId: user.id, email: googleUser.email }, 'Google email OAuth connected')

    return response.redirect(`${frontendUrl}${settingsPath}?oauth=success`)
  }
}
