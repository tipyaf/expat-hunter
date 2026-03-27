'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { usePlan } from '@/hooks/use-plan'
import { Check, Crown, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface PlanFeature {
  key: string
  free: string | boolean
  premium: string | boolean
}

export default function UpgradePage() {
  const { isPremium } = usePlan()
  const t = useTranslations('premium')

  const features: PlanFeature[] = [
    { key: 'searches', free: '2', premium: t('unlimited') },
    { key: 'contacts', free: '5', premium: t('unlimited') },
    { key: 'emails', free: '5', premium: t('unlimited') },
    { key: 'chatQuestions', free: '15', premium: t('unlimited') },
    { key: 'pipeline', free: false, premium: true },
    { key: 'aiAnalysis', free: false, premium: true },
    { key: 'emailRegenerate', free: false, premium: true },
    { key: 'expertChat', free: false, premium: true },
  ]

  return (
    <div className="flex h-dvh bg-[var(--color-bg)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg mb-4">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text-main)] mb-3">
              {t('upgradeTitle')}
            </h1>
            <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto">
              {t('upgradeSubtitle')}
            </p>
          </div>

          {/* Pricing cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Free plan */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-8">
              <h2 className="text-xl font-semibold text-[var(--color-text-main)] mb-2">
                {t('freePlan')}
              </h2>
              <p className="text-3xl font-bold text-[var(--color-text-main)] mb-1">
                {t('freePrice')}
              </p>
              <p className="text-sm text-[var(--color-text-muted)] mb-6">
                {t('freeDescription')}
              </p>
              <div className="space-y-3">
                {features.map((f) => (
                  <div key={f.key} className="flex items-center gap-3 text-sm">
                    {f.free === false ? (
                      <X className="h-4 w-4 text-[var(--color-text-subtle)] shrink-0" />
                    ) : (
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                    )}
                    <span className={f.free === false ? 'text-[var(--color-text-subtle)] line-through' : 'text-[var(--color-text-main)]'}>
                      {t(`features.${f.key}`)}
                      {typeof f.free === 'string' && <span className="ml-1 font-medium">({f.free})</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium plan */}
            <div className="relative rounded-[var(--radius-lg)] border-2 border-amber-400 bg-[var(--color-surface-light)] p-8 shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1 text-xs font-semibold text-white shadow-sm">
                  <Crown className="h-3 w-3" />
                  {t('recommended')}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-text-main)] mb-2">
                {t('premiumPlan')}
              </h2>
              <p className="text-3xl font-bold text-[var(--color-text-main)] mb-1">
                {t('premiumPrice')}
              </p>
              <p className="text-sm text-[var(--color-text-muted)] mb-6">
                {t('premiumDescription')}
              </p>
              <div className="space-y-3 mb-8">
                {features.map((f) => (
                  <div key={f.key} className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-[var(--color-text-main)]">
                      {t(`features.${f.key}`)}
                      {typeof f.premium === 'string' && <span className="ml-1 font-medium">({f.premium})</span>}
                    </span>
                  </div>
                ))}
              </div>
              {isPremium ? (
                <div className="w-full text-center rounded-[var(--radius-md)] border border-green-300 bg-green-50 px-6 py-2.5 text-sm font-semibold text-green-700">
                  {t('currentPlan')}
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full rounded-[var(--radius-md)] bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-shadow"
                  onClick={() => window.alert(t('contactAdmin'))}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Crown className="h-4 w-4" />
                    {t('choosePremium')}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Contact admin notice */}
          {!isPremium && (
            <p className="text-center text-sm text-[var(--color-text-muted)]">
              {t('contactAdmin')}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
