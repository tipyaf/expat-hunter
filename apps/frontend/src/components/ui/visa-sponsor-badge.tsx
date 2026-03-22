'use client'

import { useTranslations } from 'next-intl'

type VisaSponsorStatus = 'accredited' | 'not_found' | 'unknown'

const VISA_STYLES: Record<VisaSponsorStatus, string> = {
  accredited: 'bg-green-100 text-green-700 border border-green-200',
  not_found:  'bg-orange-100 text-orange-700 border border-orange-200',
  unknown:    'bg-[var(--color-border)] text-[var(--color-text-muted)] border border-[var(--color-border)]',
}

const VISA_ICONS: Record<VisaSponsorStatus, string> = {
  accredited: '🛂',
  not_found:  '⚠️',
  unknown:    '❓',
}

interface VisaSponsorBadgeProps {
  status: VisaSponsorStatus | null | undefined
  countries?: string[] | null
  className?: string
}

export function VisaSponsorBadge({ status, countries, className = '' }: VisaSponsorBadgeProps) {
  const t = useTranslations('badges')

  if (!status) return null

  const styles = VISA_STYLES[status] ?? VISA_STYLES.unknown
  const icon = VISA_ICONS[status]
  const label = t(`visa_${status}`)
  const countriesStr = countries?.join(', ')
  const title = countriesStr
    ? `${label} — ${countriesStr}`
    : label

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${styles} ${className}`}
      title={title}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  )
}
