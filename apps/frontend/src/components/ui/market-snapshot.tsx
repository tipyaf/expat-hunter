'use client'

import type { MarketSnapshot as MarketSnapshotData } from '@/hooks/use-market-snapshot'
import { useTranslations } from 'next-intl'

interface MarketSnapshotProps {
  snapshot: MarketSnapshotData | null
  isLoading: boolean
}

export function MarketSnapshot({ snapshot, isLoading }: MarketSnapshotProps) {
  const t = useTranslations('search')

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6 shadow-sm animate-pulse">
        <div className="h-4 w-48 bg-[var(--color-border)] rounded mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-[var(--color-border)] rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!snapshot) return null

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🌍</span>
        <h3 className="text-lg font-semibold text-[var(--color-text-main)]">
          {t('marketSnapshot')} — {snapshot.country}
          {snapshot.sector && ` / ${snapshot.sector}`}
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="rounded-lg bg-[var(--color-bg-light)] p-3 border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">{t('trend')}</p>
          <p className="text-sm font-medium text-[var(--color-text-main)]">{snapshot.trend}</p>
        </div>
        <div className="rounded-lg bg-[var(--color-bg-light)] p-3 border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">{t('bestPeriod')}</p>
          <p className="text-sm font-medium text-[var(--color-text-main)]">{snapshot.bestPeriod}</p>
        </div>
        <div className="rounded-lg bg-[var(--color-bg-light)] p-3 border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">{t('estimatedOffers')}</p>
          <p className="text-sm font-medium text-[var(--color-text-main)]">~{snapshot.estimatedOffers}</p>
        </div>
        {snapshot.averageSalary && (
          <div className="rounded-lg bg-[var(--color-bg-light)] p-3 border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">{t('averageSalary')}</p>
            <p className="text-sm font-medium text-[var(--color-text-main)]">{snapshot.averageSalary}</p>
          </div>
        )}
      </div>

      {snapshot.insights.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-1">{t('expertInsights')}</p>
          {snapshot.insights.map((insight, i) => (
            <p key={i} className="text-xs text-[var(--color-text-main)] flex items-start gap-2 leading-relaxed">
              <span className="text-[var(--color-info)] mt-0.5 shrink-0">💡</span>
              {insight}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
