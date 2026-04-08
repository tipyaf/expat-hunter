'use client'

import { JOB_OFFER_STATUSES, type JobOfferStatus } from '@/lib/job-offers-api'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

interface JobOfferStatusSelectProps {
  currentStatus: JobOfferStatus
  onChange: (status: JobOfferStatus) => void
}

/** Statuses that a user can manually transition to */
const SELECTABLE_STATUSES: readonly JobOfferStatus[] = [
  'new',
  'interested',
  'applied',
  'interview',
  'offer_received',
  'accepted',
  'rejected',
  'archived',
] as const

export function JobOfferStatusSelect({ currentStatus, onChange }: JobOfferStatusSelectProps): ReactNode {
  const t = useTranslations('jobOffersPage.statuses')

  return (
    <select
      data-testid="job-offer-status-select"
      value={currentStatus}
      onChange={(e) => {
        const value = e.target.value as JobOfferStatus
        if (JOB_OFFER_STATUSES.includes(value)) {
          onChange(value)
        }
      }}
      className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-light)] px-2 py-1 text-xs font-medium text-[var(--color-text-main)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {SELECTABLE_STATUSES.map((status) => (
        <option key={status} value={status}>
          {t(status)}
        </option>
      ))}
      {/* Show current status if it's not selectable (e.g., evaluated, excluded) */}
      {!SELECTABLE_STATUSES.includes(currentStatus) && (
        <option value={currentStatus} disabled>
          {t(currentStatus)}
        </option>
      )}
    </select>
  )
}
