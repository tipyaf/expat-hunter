'use client'

import { Button } from '@/components/ui/button'
import { StatusMessage } from '@/components/ui/status-message'
import { ApiError, useAuth } from '@/contexts/auth-context'
import Link from 'next/link'
import { type FormEvent, useState } from 'react'
import { useTranslations } from 'next-intl'

export default function RegisterPage() {
  const { register } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [locale, setLocale] = useState('fr')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const t = useTranslations('auth')
  const tc = useTranslations('common')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await register({ email, password, fullName, locale })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 409 ? t('emailConflict') : err.message)
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
        <p className="text-center text-[var(--color-text-muted)] mb-8">{t('registerTitle')}</p>

        {error && (
          <div className="mb-4">
            <StatusMessage type="error" message={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium mb-1">
              {t('fullNameLabel')}
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value)
              }}
              className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('fullNamePlaceholder')}
            />
          </div>
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
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
              }}
              className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('passwordPlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="locale" className="block text-sm font-medium mb-1">
              {t('localeLabel')}
            </label>
            <select
              id="locale"
              value={locale}
              onChange={(e) => {
                setLocale(e.target.value)
              }}
              className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="fr">{t('localeFr')}</option>
              <option value="en">{t('localeEn')}</option>
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t('registering') : t('register')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          {t('hasAccount')}{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            {t('login')}
          </Link>
        </p>
      </div>
    </div>
  )
}
