'use client'

import type { JobOfferStatus } from '@/lib/job-offers-api'
import type { JobOfferResponse } from '@/lib/job-offers-api'
import { JobOfferStatusSelect } from './job-offer-status-select'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ExternalLink, Calendar, MapPin, RefreshCw, Users } from 'lucide-react'
import type { ReactNode } from 'react'

/** Score color thresholds */
const SCORE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 60,
  LOW: 40,
} as const

function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.HIGH) return '#22C55E'
  if (score >= SCORE_THRESHOLDS.MEDIUM) return '#F59E0B'
  if (score >= SCORE_THRESHOLDS.LOW) return '#3B82F6'
  return '#64748b'
}

function getScoreLabel(score: number): string {
  if (score >= SCORE_THRESHOLDS.HIGH) return 'high'
  if (score >= SCORE_THRESHOLDS.MEDIUM) return 'medium'
  if (score >= SCORE_THRESHOLDS.LOW) return 'low'
  return 'veryLow'
}

interface JobOfferCardProps {
  offer: JobOfferResponse
  hasCrossContact?: boolean
  onStatusChange: (offerId: string, status: JobOfferStatus) => void
}

export function JobOfferCard({ offer, hasCrossContact, onStatusChange }: JobOfferCardProps): ReactNode {
  const t = useTranslations('jobOffersPage')
  const scoreColor = offer.relevanceScore !== null ? getScoreColor(offer.relevanceScore) : null

  const formattedDate = offer.publicationDates.length > 0
    ? new Date(offer.publicationDates[offer.publicationDates.length - 1]).toLocaleDateString()
    : null

  const salaryText = offer.salaryMin !== null
    ? offer.salaryMax !== null
      ? `${offer.salaryMin.toLocaleString()}–${offer.salaryMax.toLocaleString()} ${offer.salaryCurrency ?? ''}`
      : `${offer.salaryMin.toLocaleString()} ${offer.salaryCurrency ?? ''}`
    : null

  return (
    <article
      data-testid="job-offer-card"
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 transition-shadow hover:shadow-[var(--shadow-sm)]"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/offres/${offer.id}`}
            data-testid="job-offer-card-title"
            className="text-sm font-semibold text-[var(--color-text-main)] hover:text-primary transition-colors line-clamp-1"
          >
            {offer.title}
          </Link>
          <p
            data-testid="job-offer-card-company"
            className="text-xs text-[var(--color-text-muted)] mt-0.5"
          >
            {offer.companyName ?? t('unknownCompany')}
            {offer.company?.sector && ` · ${offer.company.sector}`}
          </p>
        </div>

        {/* Score badge */}
        {offer.relevanceScore !== null && (
          <div
            data-testid="job-offer-card-score"
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: scoreColor ?? undefined }}
            title={t(`score.${getScoreLabel(offer.relevanceScore)}`)}
          >
            {offer.relevanceScore}%
          </div>
        )}
      </div>

      {/* Match summary */}
      {offer.matchSummary && (
        <p className="text-xs text-[var(--color-text-muted)] mb-3 line-clamp-2">
          {offer.matchSummary}
        </p>
      )}

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)] mb-3">
        {offer.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {offer.location}
          </span>
        )}
        {formattedDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {formattedDate}
          </span>
        )}
        {salaryText && (
          <span className="font-medium text-[var(--color-text-main)]">{salaryText}</span>
        )}
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {offer.isRepublished && (
          <span
            data-testid="job-offer-card-republication"
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            {t('republished')}
          </span>
        )}
        {hasCrossContact && (
          <span
            data-testid="job-offer-card-cross-contact"
            className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-800"
          >
            <Users className="h-3 w-3" aria-hidden="true" />
            {t('crossContact')}
          </span>
        )}
      </div>

      {/* Footer: status + platform links */}
      <div className="flex items-center justify-between gap-3">
        <JobOfferStatusSelect
          currentStatus={offer.status}
          onChange={(status) => onStatusChange(offer.id, status)}
        />

        <div className="flex items-center gap-1.5">
          {offer.links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] px-2 py-1 text-[10px] font-medium text-[var(--color-text-muted)] hover:text-primary transition-colors"
              title={link.platform}
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              {link.platform}
            </a>
          ))}
        </div>
      </div>
    </article>
  )
}
