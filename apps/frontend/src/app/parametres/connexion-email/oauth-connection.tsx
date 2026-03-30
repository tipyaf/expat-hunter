'use client'

import { useTranslations } from 'next-intl'

interface OAuthConnectionInfo {
  oauthEmail: string | null
}

export interface OAuthConnectionProps {
  isOAuth: boolean
  connection: OAuthConnectionInfo | null
  onConnect: () => void
  onDisconnect: () => void
}

export function OAuthConnection({ isOAuth, connection, onConnect, onDisconnect }: OAuthConnectionProps) {
  const t = useTranslations('emailConnection')

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6">
      <h2 className="text-lg font-semibold mb-1">{t('oauthSection')}</h2>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">{t('oauthDescription')}</p>

      {isOAuth && connection ? (
        <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-light)] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-main)]">
                {t('connectedAs')} <strong>{connection.oauthEmail}</strong>
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">{t('connectedVia')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDisconnect}
            className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-error)] border border-[var(--color-error)]/30 hover:bg-[var(--color-error)]/10 transition-colors"
          >
            {t('disconnect')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          className="inline-flex items-center gap-3 rounded-lg bg-white border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {t('connectGoogle')}
        </button>
      )}
    </section>
  )
}
