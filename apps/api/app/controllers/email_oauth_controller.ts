import type { HttpContext } from '@adonisjs/core/http'
import { Secret } from '@adonisjs/core/helpers'
import env from '#start/env'
import EmailConnection, { CONNECTION_TYPE, OAUTH_PROVIDER } from '#models/email_connection'
import User from '#models/user'
import logger from '@adonisjs/core/services/logger'

const OAUTH_TOKEN_COOKIE = 'email_oauth_token'
const COOKIE_MAX_AGE_SECONDS = 600 // 10 minutes — enough for the OAuth round-trip

export default class EmailOAuthController {
  /**
   * GET /api/email-connections/oauth/google?token=JWT
   * Redirect user to Google OAuth consent for Gmail access.
   * Stores the auth token in an httpOnly cookie so the callback can authenticate.
   */
  async googleRedirect({ ally, request, response }: HttpContext) {
    const token = request.input('token')
    if (!token) {
      return response.unauthorized({ error: 'Missing authentication token' })
    }

    // Validate token by finding the user
    const user = await this.getUserFromToken(token)
    if (!user) {
      return response.unauthorized({ error: 'Invalid authentication token' })
    }

    // Store token in httpOnly cookie for the callback
    response.cookie(OAUTH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: false, // localhost dev — in production, set to true
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE_SECONDS,
      path: '/api/email-connections/oauth',
    })

    return ally.use('googleMail').redirect()
  }

  /**
   * GET /api/email-connections/oauth/google/callback
   * Handle Google OAuth callback — store tokens in email_connections.
   * Reads the auth token from the httpOnly cookie set during redirect.
   */
  async googleCallback({ ally, request, response }: HttpContext) {
    const frontendUrl = env.get('FRONTEND_URL')
    const settingsPath = '/parametres/connexion-email'

    // Recover auth token from cookie
    const token = request.cookie(OAUTH_TOKEN_COOKIE)
    if (!token) {
      logger.warn('Google email OAuth callback: no auth cookie')
      return response.redirect(`${frontendUrl}${settingsPath}?oauth=error&reason=session_expired`)
    }

    const user = await this.getUserFromToken(token)
    if (!user) {
      logger.warn('Google email OAuth callback: invalid token in cookie')
      return response.redirect(`${frontendUrl}${settingsPath}?oauth=error&reason=session_expired`)
    }

    // Clear the cookie
    response.clearCookie(OAUTH_TOKEN_COOKIE, { path: '/api/email-connections/oauth' })

    const google = ally.use('googleMail')

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

  /**
   * Validate an AdonisJS access token and return the user, or null if invalid.
   */
  private async getUserFromToken(tokenValue: string): Promise<User | null> {
    try {
      const accessToken = await User.accessTokens.verify(new Secret(tokenValue))
      if (!accessToken) return null
      return User.find(accessToken.tokenableId)
    } catch {
      return null
    }
  }
}
