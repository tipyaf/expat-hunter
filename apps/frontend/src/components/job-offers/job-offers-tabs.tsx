'use client'

import type { JobOfferTab } from '@/lib/job-offers-api'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

interface TabConfig {
  id: JobOfferTab
  labelKey: string
}

const TABS: TabConfig[] = [
  { id: 'new', labelKey: 'tabNew' },
  { id: 'applied', labelKey: 'tabApplied' },
  { id: 'archived', labelKey: 'tabArchived' },
]

interface JobOffersTabsProps {
  activeTab: JobOfferTab
  onTabChange: (tab: JobOfferTab) => void
  counts: Record<JobOfferTab, number>
}

export function JobOffersTabs({ activeTab, onTabChange, counts }: JobOffersTabsProps): ReactNode {
  const t = useTranslations('jobOffersPage')

  return (
    <div role="tablist" aria-label={t('tabs')} className="flex gap-1 border-b border-[var(--color-border)]">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            data-testid={`job-offers-tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:border-[var(--color-border)]'
            }`}
          >
            {t(tab.labelKey)}
            <span
              className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                isActive
                  ? 'bg-primary text-white'
                  : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]'
              }`}
            >
              {counts[tab.id] > 99 ? '99+' : counts[tab.id]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
