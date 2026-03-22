'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/contexts/auth-context'
import { useBlocked } from '@/hooks/use-blocked'
import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'

export default function BlockedPage() {
  const { user, isLoading: authLoading } = useAuth()
  const t = useTranslations('blocked')
  const tc = useTranslations('common')
  const { blocked, isLoading, unblock } = useBlocked()

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-text-muted)]">{tc('loading')}</p>
      </div>
    )
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <main id="main-content" className="flex-1 overflow-y-auto px-4 md:px-8 pt-8 pb-16 pl-16 md:pl-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--color-text-main)]">{t('title')}</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">{t('subtitle')}</p>
          </div>

          {isLoading ? (
            <p className="text-sm text-[var(--color-text-muted)]">{tc('loading')}</p>
          ) : blocked.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-8 text-center">
              <p className="text-[var(--color-text-muted)]">{t('empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {blocked.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        b.entityType === 'company'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {t(`type_${b.entityType}`)}
                      </span>
                    </div>
                    {b.reason && (
                      <p className="text-xs text-[var(--color-text-muted)] truncate">{b.reason}</p>
                    )}
                    {b.blockedUntil && (
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        {t('until')}: {new Date(b.blockedUntil).toLocaleDateString()}
                      </p>
                    )}
                    {!b.blockedUntil && (
                      <p className="text-[10px] text-[var(--color-text-muted)]">{t('permanent')}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void unblock(b.id)}
                    className="rounded-lg border border-red-200 p-1.5 hover:bg-red-50 transition-colors ml-3"
                    aria-label={t('unblock')}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
