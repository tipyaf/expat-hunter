'use client'

import { useTranslations } from 'next-intl'

type EmailStatus = 'verified' | 'probable' | 'unknown' | 'bounced'

const STATUS_STYLES: Record<EmailStatus, string> = {
  verified: 'bg-green-100 text-green-700',
  probable: 'bg-orange-100 text-orange-700',
  unknown:  'bg-[var(--color-border)] text-[var(--color-text-muted)]',
  bounced:  'bg-red-100 text-red-700',
}

const STATUS_ICONS: Record<EmailStatus, string> = {
  verified: '✓',
  probable: '~',
  unknown:  '?',
  bounced:  '✕',
}

interface EmailStatusBadgeProps {
  status: EmailStatus | null | undefined
  confidence?: number | null
  className?: string
}

export function EmailStatusBadge({ status, confidence, className = '' }: EmailStatusBadgeProps) {
  const t = useTranslations('badges')

  if (!status) return null

  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.unknown
  const icon = STATUS_ICONS[status]
  const label = t(`emailStatus_${status}`)
  const title = confidence != null
    ? `${label} — ${confidence}% ${t('confidence')}`
    : label

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${styles} ${className}`}
      title={title}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
      {confidence != null && (
        <span className="opacity-70 ml-0.5">{confidence}%</span>
      )}
    </span>
  )
}
