'use client'

import { useTranslations } from 'next-intl'

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg bg-[var(--color-bg-light)] border border-[var(--color-border)] p-3 text-center">
      <p className="text-2xl font-bold text-[var(--color-text-main)]">{value}</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-tight">{label}</p>
    </div>
  )
}

type SearchStatus = 'pending' | 'scraping' | 'enriching' | 'analyzing' | 'generating' | 'completed' | 'failed'

export interface SearchProgressResultsProps {
  status: SearchStatus
  contactsFound: number
  contactsRelevant: number
  emailsGenerated: number
  contactsExcludedCooldown: number
  errorMessage: string | null
  rotatingMessage: string
}

export function SearchProgressResults({
  status,
  contactsFound,
  contactsRelevant,
  emailsGenerated,
  contactsExcludedCooldown,
  errorMessage,
  rotatingMessage,
}: SearchProgressResultsProps) {
  const t = useTranslations('search')
  const isTerminal = status === 'completed' || status === 'failed'
  const isInProgress = !isTerminal

  return (
    <div aria-live="polite" aria-atomic="false" className="min-h-[5rem]">
      {status === 'completed' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard value={contactsFound} label={t('colContacts')} />
            <StatCard value={contactsRelevant} label={t('colRelevant')} />
            <StatCard value={emailsGenerated} label={t('colEmails')} />
          </div>
          {contactsExcludedCooldown > 0 && (
            <p className="text-xs text-[var(--color-text-muted)] text-center mt-2">
              {t('contactsExcluded', { count: contactsExcludedCooldown })}
            </p>
          )}
        </>
      )}

      {status === 'failed' && (
        <p className="text-sm text-red-600 text-center">
          {errorMessage ?? t('searchFailed')}
        </p>
      )}

      {isInProgress && (
        <div className="text-center space-y-2">
          {contactsFound > 0 && (
            <p className="text-sm text-[var(--color-text-main)]">
              <span className="font-semibold text-primary">{contactsFound}</span>{' '}
              {t('colContacts').toLowerCase()} {t('found')}
            </p>
          )}

          {/* Rotating activity message */}
          <p className="text-sm text-[var(--color-text-muted)] transition-opacity duration-500 min-h-[1.25rem]">
            {rotatingMessage}
          </p>

          {/* Duration hint */}
          <p className="text-xs text-[var(--color-text-subtle)] mt-2">
            {t('searchDurationHint')}
          </p>

          {/* Can close hint */}
          <p className="text-xs text-[var(--color-text-subtle)]">
            {t('searchCanClose')}
          </p>
        </div>
      )}
    </div>
  )
}
