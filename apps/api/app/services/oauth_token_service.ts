import { DateTime } from 'luxon'
import env from '#start/env'
import EmailConnection from '#models/email_connection'
import logger from '@adonisjs/core/services/logger'

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const TOKEN_EXPIRY_BUFFER_SECONDS = 300 // Refresh 5 minutes before actual expiry

interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
}

export default class OAuthTokenService {
  /**
   * Ensure the access token is fresh. Refreshes if expired or about to expire.
   * Returns the valid access token.
   */
  async ensureFreshToken(connection: EmailConnection): Promise<string> {
    if (!connection.oauthRefreshToken) {
      throw new Error('No refresh token available — user must reconnect')
    }

    if (!this.isTokenExpiringSoon(connection)) {
      return connection.oauthAccessToken!
    }

    return this.refreshAccessToken(connection)
  }

  /**
   * Refresh the Google OAuth access token using the refresh token.
   */
  async refreshAccessToken(connection: EmailConnection): Promise<string> {
    const clientId = env.get('GOOGLE_CLIENT_ID')
    const clientSecret = env.get('GOOGLE_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth client credentials not configured')
    }

    logger.info({ userId: connection.userId }, 'Refreshing OAuth access token')

    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.oauthRefreshToken!,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      logger.error({ userId: connection.userId, status: response.status, body: errorBody }, 'OAuth token refresh failed')
      throw new Error(`Token refresh failed: ${response.status}`)
    }

    const data = (await response.json()) as GoogleTokenResponse

    connection.oauthAccessToken = data.access_token
    connection.oauthExpiresAt = DateTime.now().plus({ seconds: data.expires_in })
    await connection.save()

    logger.info({ userId: connection.userId }, 'OAuth access token refreshed successfully')

    return data.access_token
  }

  private isTokenExpiringSoon(connection: EmailConnection): boolean {
    if (!connection.oauthAccessToken || !connection.oauthExpiresAt) return true
    const bufferTime = DateTime.now().plus({ seconds: TOKEN_EXPIRY_BUFFER_SECONDS })
    return connection.oauthExpiresAt < bufferTime
  }
}
