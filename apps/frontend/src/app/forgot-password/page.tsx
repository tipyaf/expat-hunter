'use client'

import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api-client'
import Link from 'next/link'
import { type FormEvent, useState } from 'react'
import { useTranslations } from 'next-intl'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const t = useTranslations('auth')
  const tc = useTranslations('common')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await apiClient.post('/api/auth/forgot-password', { email })
      setSent(true)
    } catch {
      setError(tc('genericError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-light)]">
      <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2 text-primary">{tc('appName')}</h1>
        <p className="text-center text-[var(--color-text-muted)] mb-8">
          {t('forgotPasswordTitle')}
        </p>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 px-4 py-3 text-sm text-[var(--color-success)]">
              {t('resetEmailSent')}
            </div>
            <Link href="/login" className="text-sm text-primary hover:underline">
              {t('backToLogin')}
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 px-4 py-3 text-sm text-[var(--color-error)]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  {t('emailLabel')}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t('emailPlaceholder')}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t('submitting') : t('sendResetLink')}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
              <Link href="/login" className="text-primary font-medium hover:underline">
                {t('backToLogin')}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
