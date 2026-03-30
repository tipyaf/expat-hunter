'use client'

import { ProactiveTip } from '@/components/ui/proactive-tip'
import { useTranslations } from 'next-intl'

export interface PipelineStatsProps {
  total: number
  stats: Record<string, number> | null
  tip: { message: string; cta?: { label: string; href: string } } | null
}

export function PipelineStats({ total, stats, tip }: PipelineStatsProps) {
  const t = useTranslations('pipeline')

  return (
    <>
      <div className="shrink-0 px-4 md:px-8 pt-8 pb-4 pl-16 md:pl-8 bg-[var(--color-bg-light)]">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-primary">{t('title')}</h1>
            <p className="text-[var(--color-text-muted)] mt-1">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-text-muted)]">
              {t('totalContacts', { count: total })}
            </span>
          </div>
        </div>

        {stats && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats).map(([status, count]) => (
              <span
                key={status}
                className="rounded-full bg-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)]"
              >
                {t(`stat_${status}`)}: {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Contextual ProactiveTip */}
      {tip && (
        <div className="px-4 md:px-8 py-2">
          <ProactiveTip message={tip.message} cta={tip.cta} />
        </div>
      )}
    </>
  )
}
