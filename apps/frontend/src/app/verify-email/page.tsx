'use client'

import { apiClient } from '@/lib/api-client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const t = useTranslations('auth')
  const tc = useTranslations('common')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }

    apiClient.post('/api/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-light)]">
      <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-8 shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-2 text-primary">{tc('appName')}</h1>

        {status === 'loading' && (
          <p className="text-[var(--color-text-muted)] mt-6">{t('verifyingEmail')}</p>
        )}

        {status === 'success' && (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-800 dark:text-green-300">
              {t('emailVerified')}
            </div>
            <Link href="/login" className="inline-block text-sm text-primary font-medium hover:underline">
              {t('backToLogin')}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 px-4 py-3 text-sm text-[var(--color-error)]">
              {t('verificationFailed')}
            </div>
            <Link href="/login" className="inline-block text-sm text-primary font-medium hover:underline">
              {t('backToLogin')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  const tc = useTranslations('common')
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p>{tc('loading')}</p></div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
