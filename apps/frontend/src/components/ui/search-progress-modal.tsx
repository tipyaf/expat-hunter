'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'
import { TopIcon, StepIndicator, useRotatingMessage } from './search-progress-steps'
import { SearchProgressResults } from './search-progress-results'

type SearchStatus = 'pending' | 'scraping' | 'enriching' | 'analyzing' | 'generating' | 'completed' | 'failed'

interface SearchProgressModalProps {
  open: boolean
  country: string
  sector: string | null
  status: SearchStatus
  currentStep: string | null
  progressPercent: number
  contactsFound: number
  contactsRelevant: number
  emailsGenerated: number
  contactsExcludedCooldown: number
  errorMessage: string | null
  onClose: () => void
  onRetry: () => void
  onViewEmails: () => void
}

export function SearchProgressModal({
  open,
  country,
  sector,
  status,
  currentStep,
  progressPercent,
  contactsFound,
  contactsRelevant,
  emailsGenerated,
  contactsExcludedCooldown,
  errorMessage,
  onClose,
  onRetry,
  onViewEmails,
}: SearchProgressModalProps) {
  const t = useTranslations('search')
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const rotatingMessage = useRotatingMessage(status, currentStep, t)

  const steps = [
    { key: 'scraping', label: t('stepScraping'), description: t('stepScrapingDesc') },
    { key: 'enriching', label: t('stepEnriching'), description: t('stepEnrichingDesc') },
    { key: 'analyzing', label: t('stepAnalyzing'), description: t('stepAnalyzingDesc') },
    { key: 'generating', label: t('stepGenerating'), description: t('stepGeneratingDesc') },
  ]

  const isTerminal = status === 'completed' || status === 'failed'

  // Focus management
  useEffect(() => {
    if (open && isTerminal) {
      closeButtonRef.current?.focus()
    }
  }, [open, isTerminal])

  // Escape to close (always)
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      aria-labelledby="search-modal-title"
    >
      <div className="relative w-full max-w-md mx-4 sm:mx-0 mb-4 sm:mb-0 rounded-2xl bg-[var(--color-surface-light)] p-6 sm:p-8 shadow-2xl">

        {/* Close button — always visible */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-light)] hover:text-[var(--color-text-main)] transition-colors"
          aria-label={t('close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top icon */}
        <div className="flex flex-col items-center text-center mb-5">
          <TopIcon status={status} />
          <h2
            id="search-modal-title"
            className="text-xl font-bold text-[var(--color-text-main)] mt-3"
          >
            {(() => {
              if (status === 'completed') return t('searchComplete')
              if (status === 'failed') return t('searchFailed')
              return t('launching')
            })()}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {country}{sector ? ` · ${sector}` : ''}
          </p>
        </div>

        <div className="border-t border-[var(--color-border)] my-5" />

        {/* Step indicator */}
        <StepIndicator steps={steps} currentStep={currentStep} status={status} />

        <div className="border-t border-[var(--color-border)] my-5" />

        {/* Live info area */}
        <SearchProgressResults
          status={status}
          contactsFound={contactsFound}
          contactsRelevant={contactsRelevant}
          emailsGenerated={emailsGenerated}
          contactsExcludedCooldown={contactsExcludedCooldown}
          errorMessage={errorMessage}
          rotatingMessage={rotatingMessage}
        />

        {/* Actions */}
        {isTerminal && (
          <div className="flex flex-col sm:flex-row-reverse gap-3 mt-6">
            {status === 'completed' && (
              <button
                type="button"
                onClick={onViewEmails}
                className="w-full sm:w-auto rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
              >
                {emailsGenerated > 0 ? `${t('viewEmails')} →` : `${t('viewContacts')} →`}
              </button>
            )}
            {status === 'failed' && (
              <button
                type="button"
                onClick={onRetry}
                className="w-full sm:w-auto rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
              >
                {t('retry')}
              </button>
            )}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg-light)] transition-colors"
            >
              {t('close')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
