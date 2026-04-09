'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, ExternalLink, AlertTriangle, XCircle } from 'lucide-react'
import { JobOfferStatusSelect } from './job-offer-status-select'
import type { JobOfferStatus } from '@/lib/job-offers-api'
import type { ReactNode } from 'react'

interface JobOfferDetailHeaderProps {
  title: string
  companyName: string | null
  location: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  remoteType: string | null
  publicationDates: string[]
  closingDate: string | null
  status: JobOfferStatus
  isRepublished: boolean
  exclusionReason?: string | null
  links: Array<{ platform: string; url: string; applyUrl: string | null }>
  onStatusChange: (status: JobOfferStatus) => void
  onCancelExclusion?: () => void
  onReactivate?: () => void
}

function formatSalary(min: number | null, max: number | null, currency: string | null = ''): string | null {
  if (min === null) return null
  if (max !== null) return `${min.toLocaleString()}–${max.toLocaleString()} ${currency}`
  return `${min.toLocaleString()} ${currency}`
}

export function JobOfferDetailHeader({
  title,
  companyName,
  location,
  salaryMin,
  salaryMax,
  salaryCurrency,
  remoteType,
  publicationDates,
  closingDate,
  status,
  isRepublished,
  exclusionReason,
  links,
  onStatusChange,
  onCancelExclusion,
  onReactivate,
}: JobOfferDetailHeaderProps): ReactNode {
  const t = useTranslations('jobOfferDetailPage')
  const salary = formatSalary(salaryMin, salaryMax, salaryCurrency)
  const latestDate = publicationDates.length > 0
    ? new Date(publicationDates[publicationDates.length - 1]).toLocaleDateString()
    : null

  return (
    <div data-testid="job-offer-detail" className="space-y-4">
      {/* Breadcrumb */}
      <Link
        href="/offres"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-primary transition-colors"
        data-testid="back-to-offers"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        {t('backToOffers')}
      </Link>

      {/* Expired banner */}
      {status === 'expired' && (
        <div
          data-testid="expired-banner"
          className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 px-4 py-3"
        >
          <div className="flex items-center gap-2 text-sm text-[var(--color-warning)]">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{t('expiredWarning')}</span>
          </div>
          {onReactivate && (
            <button
              type="button"
              onClick={onReactivate}
              data-testid="reactivate-button"
              className="text-sm font-medium text-[var(--color-warning)] hover:underline"
            >
              {t('reactivate')}
            </button>
          )}
        </div>
      )}

      {/* Excluded banner */}
      {status === 'excluded' && (
        <div
          data-testid="excluded-banner"
          className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-text-muted)]/30 bg-[var(--color-text-muted)]/5 px-4 py-3"
        >
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <XCircle size={16} aria-hidden="true" />
            <span>
              {t('excludedBanner')}
              {exclusionReason && (
                <> — {exclusionReason}</>
              )}
            </span>
          </div>
          {onCancelExclusion && (
            <button
              type="button"
              onClick={onCancelExclusion}
              data-testid="cancel-exclusion-button"
              className="text-sm font-medium text-primary hover:underline"
            >
              {t('cancelExclusion')}
            </button>
          )}
        </div>
      )}

      {/* Title + status */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-main)]">{title}</h1>
          {companyName && (
            <p className="mt-1 text-[var(--color-text-muted)]">{companyName}</p>
          )}
        </div>
        <JobOfferStatusSelect
          currentStatus={status}
          onChange={onStatusChange}
        />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-4 text-sm text-[var(--color-text-muted)]">
        {location && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={14} aria-hidden="true" />
            {location}
          </span>
        )}
        {salary && (
          <span data-testid="salary-display" className="font-medium text-[var(--color-text-main)]">
            {salary}
          </span>
        )}
        {remoteType && (
          <span className="rounded-full bg-[var(--color-border)]/30 px-2 py-0.5 text-xs">
            {t(`remoteType.${remoteType}`)}
          </span>
        )}
        {latestDate && (
          <span className="inline-flex items-center gap-1">
            <Calendar size={14} aria-hidden="true" />
            {latestDate}
          </span>
        )}
        {isRepublished && (
          <span className="rounded-full bg-[var(--color-warning)]/10 px-2 py-0.5 text-xs text-[var(--color-warning)]">
            {t('republished')}
          </span>
        )}
      </div>

      {/* Platform links */}
      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              data-testid={`platform-link-${link.platform}`}
            >
              <ExternalLink size={12} aria-hidden="true" />
              {link.platform}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
