'use client'

import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { SocialAuthButton } from '@/components/ui/social-auth-button'
import { ApiError, useAuth } from '@/contexts/auth-context'
import Link from 'next/link'
import { type FormEvent, useState } from 'react'
import { useTranslations } from 'next-intl'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const t = useTranslations('auth')
  const tc = useTranslations('common')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login(email, password)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError(t('tooManyAttempts'))
        } else if (err.status === 423) {
          setError(t('accountLocked'))
        } else {
          setError(err.status === 400 ? t('invalidCredentials') : err.message)
        }
      } else {
        setError(tc('genericError'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-light)]">
      <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2 text-primary">{tc('appName')}</h1>
        <p className="text-center text-[var(--color-text-muted)] mb-8">
          {t('loginTitle')}
        </p>

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
              onChange={(e) => {
                setEmail(e.target.value)
              }}
              className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('emailPlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              {t('passwordLabel')}
            </label>
            <PasswordInput
              id="password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
              }}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t('submitting') : t('submit')}
          </Button>
        </form>

        <p className="mt-4 text-center">
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">
            {t('forgotPassword')}
          </Link>
        </p>

        <p className="mt-4 text-center text-sm text-[var(--color-text-muted)]">
          {t('noAccount')}{' '}
          <Link href="/register" className="text-primary font-medium hover:underline">
            {t('createAccount')}
          </Link>
        </p>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="text-xs text-[var(--color-text-muted)]">{t('orContinueWith')}</span>
          <div className="h-px flex-1 bg-[var(--color-border)]" />
        </div>
        <div className="mt-4">
          <SocialAuthButton
            provider="google"
            label={t('continueWithGoogle')}
            onClick={() => {
              window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`
            }}
          />
        </div>
      </div>
    </div>
  )
}

