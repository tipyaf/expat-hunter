'use client'

import { useTranslations } from 'next-intl'
import { Users } from 'lucide-react'
import type { ReactNode } from 'react'

interface CrossPipelineBadgeProps {
  companyName: string
}

export function CrossPipelineBadge({ companyName }: CrossPipelineBadgeProps): ReactNode {
  const t = useTranslations('jobOfferDetailPage')

  return (
    <div
      data-testid="cross-pipeline-badge"
      className="flex items-center gap-2 rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary"
    >
      <Users size={16} aria-hidden="true" />
      <span>{t('crossContact', { company: companyName })}</span>
    </div>
  )
}
