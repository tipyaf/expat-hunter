'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/contexts/auth-context'
import { useProfile } from '@/hooks/use-profile'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const { profile, isLoading: profileLoading } = useProfile()
  const router = useRouter()
  const t = useTranslations('dashboard')
  const tc = useTranslations('common')

  useEffect(() => {
    if (!isLoading && !profileLoading && user && !profile?.onboardingCompleted) {
      router.push('/profile/setup')
    }
  }, [isLoading, profileLoading, user, profile, router])

  if (isLoading || profileLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-text-muted)]">{tc('loading')}</p>
      </div>
    )
  }

  // Redirect if profile not set up (null or not completed)
  if (!profile?.onboardingCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-text-muted)]">{tc('redirecting')}</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-8 pt-8 pb-4 bg-[var(--color-bg-light)]">
          <h1 className="text-3xl font-bold text-primary mb-2">{t('title')}</h1>
          <p className="text-[var(--color-text-muted)]">{t('welcome', { name: user.fullName })}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6 shadow-sm">
            <h2 className="text-sm font-medium text-[var(--color-text-muted)] mb-1">{t('contacts')}</h2>
            <p className="text-2xl font-bold">0</p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6 shadow-sm">
            <h2 className="text-sm font-medium text-[var(--color-text-muted)] mb-1">
              {t('emailsSent')}
            </h2>
            <p className="text-2xl font-bold">0</p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6 shadow-sm">
            <h2 className="text-sm font-medium text-[var(--color-text-muted)] mb-1">{t('pipeline')}</h2>
            <p className="text-2xl font-bold">0</p>
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}
