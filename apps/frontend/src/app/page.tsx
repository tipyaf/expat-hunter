'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/contexts/auth-context'
import { useDashboard } from '@/hooks/use-dashboard'
import { useProfile } from '@/hooks/use-profile'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { ProactiveTip } from '@/components/ui/proactive-tip'
import { Mail, MessageSquare, Search, TrendingUp, Users, Award } from 'lucide-react'

const ACTION_ICONS: Record<string, typeof Mail> = {
  emails_to_validate: Mail,
  replies_received: MessageSquare,
  sourcing_completed: Users,
  searches_in_progress: Search,
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const { profile, isLoading: profileLoading } = useProfile()
  const { actions, stats, tip, isLoading: dashLoading } = useDashboard()
  const router = useRouter()
  const t = useTranslations('dashboard')
  const tc = useTranslations('common')

  useEffect(() => {
    if (!isLoading && !profileLoading && user && profile && !profile.onboardingCompleted) {
      router.push('/onboarding')
    }
  }, [isLoading, profileLoading, user, profile, router])

  if (isLoading || profileLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-text-muted)]">{tc('loading')}</p>
      </div>
    )
  }

  if (profile && !profile.onboardingCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-text-muted)]">{tc('redirecting')}</p>
      </div>
    )
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 md:px-8 pt-8 pb-4 pl-16 md:pl-8 bg-[var(--color-bg-light)]">
          <h1 className="text-3xl font-bold text-primary mb-2">{t('title')}</h1>
          <p className="text-[var(--color-text-muted)]">{t('welcome', { name: user.fullName })}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8">
          {/* Expert tip — contextual from API */}
          {!dashLoading && (
            <div className="mb-6">
              <ProactiveTip
                message={tip?.message ?? t('dashboardReady')}
                cta={tip?.cta ?? { label: t('dashboardReadyCta'), href: '/recherche' }}
              />
            </div>
          )}

          {/* Actions en attente */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">
              {t('pendingActions', { count: actions.length })}
            </h2>
            {(() => {
              if (dashLoading) {
                return (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] animate-pulse" />
                    ))}
                  </div>
                )
              }
              if (actions.length === 0) {
                return (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6 text-center">
                    <p className="text-[var(--color-text-muted)]">{t('noActions')}</p>
                    <Link href="/recherche" className="text-primary text-sm font-medium hover:underline mt-2 inline-block">
                      {t('startSourcing')}
                    </Link>
                  </div>
                )
              }
              return (
                <div className="space-y-3">
                  {actions.map((action) => (
                  <Link
                    key={action.type}
                    href={action.href}
                    className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 shadow-sm hover:border-primary/30 transition-colors"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-primary/10 text-primary">
                      {(() => { const Icon = ACTION_ICONS[action.type]; return Icon ? <Icon className="h-5 w-5" /> : null })()}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">
                        {t(`action_${action.label}`, { count: action.count })}
                      </p>
                    </div>
                    <span className="text-[var(--color-text-muted)] text-sm">{t('view')}</span>
                  </Link>
                ))}
              </div>
            )
            })()}
          </div>

          {/* Statistiques rapides */}
          <div>
            <h2 className="text-lg font-semibold mb-4">{t('quickStats')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-medium text-[var(--color-text-muted)]">{t('contacts')}</h3>
                </div>
                <p className="text-2xl font-bold">{stats.contacts}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-medium text-[var(--color-text-muted)]">{t('emailsSent')}</h3>
                </div>
                <p className="text-2xl font-bold">{stats.emailsSent}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-medium text-[var(--color-text-muted)]">{t('repliesReceived')}</h3>
                </div>
                <p className="text-2xl font-bold">{stats.replies}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-medium text-[var(--color-text-muted)]">{t('responseRate')}</h3>
                </div>
                <p className="text-2xl font-bold">
                  {stats.responseRate}
                  <span className="text-sm font-normal text-[var(--color-text-muted)] ml-0.5">%</span>
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <h3 className="text-xs font-medium text-[var(--color-text-muted)]">{t('interviews')}</h3>
                </div>
                <p className="text-2xl font-bold">{stats.interviews}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
