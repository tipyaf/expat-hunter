'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { FileText, Mail, Send } from 'lucide-react'
import type { ReactNode } from 'react'

interface JobOfferActionsBarProps {
  offerId: string
}

export function JobOfferActionsBar({ offerId }: JobOfferActionsBarProps): ReactNode {
  const t = useTranslations('jobOfferDetailPage')
  const basePath = `/offres/${offerId}/candidature`

  return (
    <div
      data-testid="job-offer-actions-bar"
      className="flex flex-wrap gap-3"
    >
      <Link
        href={`${basePath}?section=cv`}
        data-testid="action-adapt-cv"
        className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-primary bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        <FileText size={16} aria-hidden="true" />
        {t('actionAdaptCv')}
      </Link>

      <Link
        href={`${basePath}?section=cover-letter`}
        data-testid="action-cover-letter"
        className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-primary bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        <Mail size={16} aria-hidden="true" />
        {t('actionCoverLetter')}
      </Link>

      <Link
        href={`${basePath}?section=email`}
        data-testid="action-apply"
        className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
      >
        <Send size={16} aria-hidden="true" />
        {t('actionApply')}
      </Link>
    </div>
  )
}
