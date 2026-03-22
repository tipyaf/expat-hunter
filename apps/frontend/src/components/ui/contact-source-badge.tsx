'use client'

import { useTranslations } from 'next-intl'

type EmailSource = 'scraped' | 'hunter' | 'apollo' | 'inferred' | 'page'

const SOURCE_STYLES: Record<EmailSource, string> = {
  page:     'bg-green-100 text-green-700',
  hunter:   'bg-blue-100 text-blue-700',
  apollo:   'bg-purple-100 text-purple-700',
  inferred: 'bg-orange-100 text-orange-700',
  scraped:  'bg-[var(--color-border)] text-[var(--color-text-muted)]',
}

interface ContactSourceBadgeProps {
  source: EmailSource | null | undefined
  className?: string
}

export function ContactSourceBadge({ source, className = '' }: ContactSourceBadgeProps) {
  const t = useTranslations('badges')

  if (!source) return null

  const styles = SOURCE_STYLES[source] ?? SOURCE_STYLES.scraped

  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${styles} ${className}`}
      title={t(`source_${source}_title`)}
    >
      {t(`source_${source}`)}
    </span>
  )
}
