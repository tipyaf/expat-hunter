'use client'

import type { JobOfferTab } from '@/lib/job-offers-api'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Briefcase, Search } from 'lucide-react'
import type { ReactNode } from 'react'

interface JobOffersEmptyStateProps {
  tab: JobOfferTab
}

const TAB_CONFIG: Record<JobOfferTab, { icon: typeof Briefcase; ctaHref: string; ctaKey: string }> = {
  new: { icon: Search, ctaHref: '/recherche-offres', ctaKey: 'ctaNewSearch' },
  applied: { icon: Briefcase, ctaHref: '/offres', ctaKey: 'ctaExploreOffers' },
  archived: { icon: Briefcase, ctaHref: '/offres', ctaKey: 'ctaExploreOffers' },
}

export function JobOffersEmptyState({ tab }: JobOffersEmptyStateProps): ReactNode {
  const t = useTranslations('jobOffersPage.emptyState')
  const config = TAB_CONFIG[tab]
  const Icon = config.icon

  return (
    <div
      data-testid="job-offers-empty-state"
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-raised)]">
        <Icon className="h-8 w-8 text-[var(--color-text-muted)]" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-[var(--color-text-main)]">
        {t(`${tab}Title`)}
      </h3>
      <p className="mb-6 max-w-sm text-sm text-[var(--color-text-muted)]">
        {t(`${tab}Description`)}
      </p>
      <Link
        href={config.ctaHref}
        className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        {t(config.ctaKey)}
      </Link>
    </div>
  )
}
