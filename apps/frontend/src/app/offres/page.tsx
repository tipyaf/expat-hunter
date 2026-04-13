'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { JobOfferCard } from '@/components/job-offers/job-offer-card'
import { JobOffersTabs } from '@/components/job-offers/job-offers-tabs'
import { JobOffersEmptyState } from '@/components/job-offers/job-offers-empty-state'
import { JobOfferCardSkeletonList } from '@/components/job-offers/job-offer-card-skeleton'
import { useAuth } from '@/contexts/auth-context'
import { useJobOffers } from '@/hooks/use-job-offers'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TAB_STATUS_MAP, type JobOfferTab } from '@/lib/job-offers-api'
import { markOffersSeen } from '@/lib/offer-notification-api'

export default function JobOffersPage(): React.ReactNode {
  const { user, token, isLoading: authLoading } = useAuth()
  const t = useTranslations('jobOffersPage')
  const tc = useTranslations('common')
  const hasMarkedSeen = useRef(false)

  // Mark offers as seen when the page loads (once)
  useEffect(() => {
    if (!authLoading && user && token && !hasMarkedSeen.current) {
      hasMarkedSeen.current = true
      void markOffersSeen(token)
    }
  }, [authLoading, user, token])

  const [searchFilter, setSearchFilter] = useState<string>('')
  const {
    offers,
    meta,
    page,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    updateOfferStatus,
    goToPage,
  } = useJobOffers({ searchId: searchFilter || undefined })

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-text-muted)]">{tc('loading')}</p>
      </div>
    )
  }

  // Client-side filtering by active tab
  const tabStatuses = TAB_STATUS_MAP[activeTab]
  const filteredOffers = offers.filter((o) => (tabStatuses as readonly string[]).includes(o.status))

  // Tab counts from all loaded offers
  const tabCounts: Record<JobOfferTab, number> = {
    new: offers.filter((o) => (TAB_STATUS_MAP.new as readonly string[]).includes(o.status)).length,
    applied: offers.filter((o) => (TAB_STATUS_MAP.applied as readonly string[]).includes(o.status)).length,
    archived: offers.filter((o) => (TAB_STATUS_MAP.archived as readonly string[]).includes(o.status)).length,
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-surface-main)]">
      <Sidebar />
      <main id="main-content" className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--color-text-main)]">{t('title')}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t('subtitle')}</p>
          </div>

          {/* Search filter */}
          <div className="mb-4">
            <select
              data-testid="job-offers-search-filter"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <option value="">{t('allSearches')}</option>
            </select>
          </div>

          {/* Tabs */}
          <JobOffersTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={tabCounts}
          />

          {/* Content */}
          <div className="mt-4">
            {isLoading && <JobOfferCardSkeletonList />}

            {!isLoading && error && (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-4 text-center">
                <p className="text-sm text-[var(--color-error)]">{error}</p>
                <button
                  type="button"
                  onClick={() => void goToPage(page)}
                  className="mt-2 text-sm font-medium text-primary hover:underline"
                >
                  {tc('retry')}
                </button>
              </div>
            )}

            {!isLoading && !error && filteredOffers.length === 0 && (
              <JobOffersEmptyState tab={activeTab} />
            )}

            {!isLoading && !error && filteredOffers.length > 0 && (
              <div className="grid gap-3">
                {filteredOffers.map((offer) => (
                  <JobOfferCard
                    key={offer.id}
                    offer={offer}
                    onStatusChange={updateOfferStatus}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {meta && meta.lastPage > 1 && (
              <div data-testid="job-offers-pagination" className="mt-6 flex items-center justify-center gap-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => void goToPage(page - 1)}
                  className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('pagination.prev')}
                </button>
                <span className="text-sm text-[var(--color-text-muted)]">
                  {t('pagination.page', { current: page, total: meta.lastPage })}
                </span>
                <button
                  type="button"
                  disabled={page >= meta.lastPage}
                  onClick={() => void goToPage(page + 1)}
                  className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('pagination.next')}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
