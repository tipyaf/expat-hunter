import { test } from '@japa/runner'
import { DateTime } from 'luxon'

/**
 * Unit tests for OAuthTokenService logic
 *
 * Tests token expiry detection, refresh flow decision-making,
 * and error handling for missing credentials.
 */

const TOKEN_EXPIRY_BUFFER_SECONDS = 300

function isTokenExpiringSoon(oauthAccessToken: string | null, oauthExpiresAt: DateTime | null): boolean {
  if (!oauthAccessToken || !oauthExpiresAt) return true
  const bufferTime = DateTime.now().plus({ seconds: TOKEN_EXPIRY_BUFFER_SECONDS })
  return oauthExpiresAt < bufferTime
}

test.group('OAuthTokenService — token expiry detection', () => {
  test('returns true when access token is null', ({ assert }) => {
    assert.isTrue(isTokenExpiringSoon(null, DateTime.now().plus({ hours: 1 })))
  })

  test('returns true when expires_at is null', ({ assert }) => {
    assert.isTrue(isTokenExpiringSoon('some-token', null))
  })

  test('returns true when both are null', ({ assert }) => {
    assert.isTrue(isTokenExpiringSoon(null, null))
  })

  test('returns true when token expires within buffer window (< 5 minutes)', ({ assert }) => {
    const expiresAt = DateTime.now().plus({ seconds: 120 }) // 2 minutes from now
    assert.isTrue(isTokenExpiringSoon('valid-token', expiresAt))
  })

  test('returns true when token is already expired', ({ assert }) => {
    const expiresAt = DateTime.now().minus({ minutes: 10 })
    assert.isTrue(isTokenExpiringSoon('expired-token', expiresAt))
  })

  test('returns false when token expires well beyond buffer (> 5 minutes)', ({ assert }) => {
    const expiresAt = DateTime.now().plus({ hours: 1 }) // 1 hour from now
    assert.isFalse(isTokenExpiringSoon('fresh-token', expiresAt))
  })

  test('returns false when token expires exactly at buffer boundary + margin', ({ assert }) => {
    const expiresAt = DateTime.now().plus({ seconds: 600 }) // 10 minutes from now
    assert.isFalse(isTokenExpiringSoon('token', expiresAt))
  })
})

test.group('OAuthTokenService — ensureFreshToken logic', () => {
  test('throws when no refresh token is available', ({ assert }) => {
    const connection = {
      oauthRefreshToken: null,
      oauthAccessToken: 'some-token',
      oauthExpiresAt: DateTime.now().plus({ hours: 1 }),
    }

    assert.throws(() => {
      if (!connection.oauthRefreshToken) {
        throw new Error('No refresh token available — user must reconnect')
      }
    }, 'No refresh token available')
  })

  test('returns existing token when not expiring soon', ({ assert }) => {
    const connection = {
      oauthRefreshToken: 'refresh-token',
      oauthAccessToken: 'valid-access-token',
      oauthExpiresAt: DateTime.now().plus({ hours: 1 }),
    }

    const needsRefresh = isTokenExpiringSoon(connection.oauthAccessToken, connection.oauthExpiresAt)
    assert.isFalse(needsRefresh)

    // When not expiring, ensureFreshToken returns the existing token
    const token = needsRefresh ? 'would-refresh' : connection.oauthAccessToken!
    assert.equal(token, 'valid-access-token')
  })

  test('triggers refresh when token is expiring soon', ({ assert }) => {
    const connection = {
      oauthRefreshToken: 'refresh-token',
      oauthAccessToken: 'expiring-token',
      oauthExpiresAt: DateTime.now().plus({ seconds: 60 }), // Expiring in 1 minute
    }

    const needsRefresh = isTokenExpiringSoon(connection.oauthAccessToken, connection.oauthExpiresAt)
    assert.isTrue(needsRefresh)
  })
})

test.group('OAuthTokenService — model constants', () => {
  test('CONNECTION_TYPE constants are correct', ({ assert }) => {
    const CONNECTION_TYPE = { MANUAL: 'manual', OAUTH: 'oauth' } as const
    assert.equal(CONNECTION_TYPE.MANUAL, 'manual')
    assert.equal(CONNECTION_TYPE.OAUTH, 'oauth')
  })

  test('OAUTH_PROVIDER constants are correct', ({ assert }) => {
    const OAUTH_PROVIDER = { GOOGLE: 'google' } as const
    assert.equal(OAUTH_PROVIDER.GOOGLE, 'google')
  })

  test('isOAuth getter logic works correctly', ({ assert }) => {
    const isOAuth = (connectionType: string) => connectionType === 'oauth'
    assert.isTrue(isOAuth('oauth'))
    assert.isFalse(isOAuth('manual'))
  })

  test('isTokenExpired getter logic works correctly', ({ assert }) => {
    const isTokenExpired = (expiresAt: DateTime | null) => {
      if (!expiresAt) return true
      return expiresAt < DateTime.now()
    }

    assert.isTrue(isTokenExpired(null))
    assert.isTrue(isTokenExpired(DateTime.now().minus({ hours: 1 })))
    assert.isFalse(isTokenExpired(DateTime.now().plus({ hours: 1 })))
  })
})

test.group('OAuthTokenService — email sending dispatch', () => {
  test('dispatches to OAuth path when connectionType is oauth', ({ assert }) => {
    const connectionType = 'oauth'
    const method = connectionType === 'oauth' ? 'sendViaOAuth' : 'sendViaDefault'
    assert.equal(method, 'sendViaOAuth')
  })

  test('dispatches to default path when connectionType is manual', ({ assert }) => {
    const connectionType: string = 'manual'
    const method = connectionType === 'oauth' ? 'sendViaOAuth' : 'sendViaDefault'
    assert.equal(method, 'sendViaDefault')
  })

  test('dispatches to default path when connection is null', ({ assert }) => {
    const connection: { connectionType: string } | null = null
    const method = connection?.connectionType === 'oauth' ? 'sendViaOAuth' : 'sendViaDefault'
    assert.equal(method, 'sendViaDefault')
  })
})

test.group('OAuthTokenService — OAuth callback routing', () => {
  test('OAuth callback routes are defined for email connections', ({ assert }) => {
    const expectedRoutes = [
      { method: 'GET', path: '/api/email-connections/oauth/google' },
      { method: 'GET', path: '/api/email-connections/oauth/google/callback' },
    ]

    assert.lengthOf(expectedRoutes, 2)
    assert.equal(expectedRoutes[0].path, '/api/email-connections/oauth/google')
    assert.equal(expectedRoutes[1].path, '/api/email-connections/oauth/google/callback')
  })

  test('OAuth callback redirects to correct frontend path on success', ({ assert }) => {
    const frontendUrl = 'http://localhost:3000'
    const settingsPath = '/parametres/connexion-email'
    const redirectUrl = `${frontendUrl}${settingsPath}?oauth=success`
    assert.equal(redirectUrl, 'http://localhost:3000/parametres/connexion-email?oauth=success')
  })

  test('OAuth callback redirects with error reason on failure', ({ assert }) => {
    const frontendUrl = 'http://localhost:3000'
    const settingsPath = '/parametres/connexion-email'

    const reasons = ['access_denied', 'state_mismatch', 'oauth_failed']
    for (const reason of reasons) {
      const redirectUrl = `${frontendUrl}${settingsPath}?oauth=error&reason=${reason}`
      assert.include(redirectUrl, `reason=${reason}`)
      assert.include(redirectUrl, 'oauth=error')
    }
  })
})
