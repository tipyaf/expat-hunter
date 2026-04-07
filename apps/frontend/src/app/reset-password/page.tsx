'use client'

import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { apiClient } from '@/lib/api-client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { type FormEvent, useState, Suspense } from 'react'
import { useTranslations } from 'next-intl'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const t = useTranslations('auth')

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-[var(--color-error)]">{t('invalidResetLink')}</p>
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          {t('requestNewLink')}
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'))
      return
    }
    if (password.length < 8) {
      setError(t('passwordTooShort'))
      return
    }

    setIsSubmitting(true)

    try {
      await apiClient.post('/api/auth/reset-password', { token, password })
      setSuccess(true)
    } catch {
      setError(t('resetFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 px-4 py-3 text-sm text-[var(--color-success)]">
          {t('passwordResetSuccess')}
        </div>
        <Link href="/login" className="text-sm text-primary hover:underline font-medium">
          {t('backToLogin')}
        </Link>
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 px-4 py-3 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            {t('newPasswordLabel')}
          </label>
          <PasswordInput
            id="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
            {t('confirmPasswordLabel')}
          </label>
          <PasswordInput
            id="confirmPassword"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('submitting') : t('resetPasswordButton')}
        </Button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  const t = useTranslations('auth')
  const tc = useTranslations('common')

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-light)]">
      <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2 text-primary">{tc('appName')}</h1>
        <p className="text-center text-[var(--color-text-muted)] mb-8">
          {t('resetPasswordTitle')}
        </p>
        <Suspense fallback={<p className="text-center text-sm text-[var(--color-text-muted)]">{tc('loading')}</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
