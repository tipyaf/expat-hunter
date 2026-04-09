'use client'

import { useTranslations } from 'next-intl'
import { useState, useCallback, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { ExclusionCategory } from '@/lib/job-offers-api'
import { EXCLUSION_CATEGORIES } from '@/lib/job-offers-api'
import type { ReactNode } from 'react'

const REASON_MAX_LENGTH = 500

interface ExclusionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (category: ExclusionCategory, reason: string) => void
}

export function ExclusionModal({ isOpen, onClose, onConfirm }: ExclusionModalProps): ReactNode {
  const t = useTranslations('jobOfferDetailPage')
  const [category, setCategory] = useState<ExclusionCategory>(EXCLUSION_CATEGORIES[0])
  const [reason, setReason] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus trap and Escape handler
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    closeButtonRef.current?.focus()

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleConfirm = useCallback((): void => {
    onConfirm(category, reason.trim())
    setCategory(EXCLUSION_CATEGORIES[0])
    setReason('')
  }, [category, reason, onConfirm])

  if (!isOpen) return null

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="exclusion-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <dialog
        ref={modalRef as unknown as React.RefObject<HTMLDialogElement>}
        open
        aria-labelledby="exclusion-modal-title"
        data-testid="exclusion-modal"
        className="mx-4 w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id="exclusion-modal-title" className="text-lg font-semibold text-[var(--color-text-main)]">
            {t('excludeTitle')}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="rounded-full p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/30"
          >
            <X size={18} />
          </button>
        </div>

        {/* Category select */}
        <div className="mb-4">
          <label htmlFor="exclusion-category-select" className="mb-1 block text-sm font-medium text-[var(--color-text-main)]">
            {t('excludeCategoryLabel')}
          </label>
          <select
            id="exclusion-category-select"
            data-testid="exclusion-category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExclusionCategory)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-2 text-sm text-[var(--color-text-main)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {EXCLUSION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{t(`exclusionCategory.${cat}`)}</option>
            ))}
          </select>
        </div>

        {/* Reason textarea */}
        <div className="mb-6">
          <label htmlFor="exclusion-reason-input" className="mb-1 block text-sm font-medium text-[var(--color-text-main)]">
            {t('excludeReasonLabel')}
          </label>
          <textarea
            id="exclusion-reason-input"
            data-testid="exclusion-reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={REASON_MAX_LENGTH}
            rows={3}
            placeholder={t('excludeReasonPlaceholder')}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-2 text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-light)]"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            data-testid="exclusion-confirm-button"
            onClick={handleConfirm}
            className="rounded-[var(--radius-md)] bg-[var(--color-error)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-error)]/90"
          >
            {t('excludeConfirm')}
          </button>
        </div>
      </dialog>
    </div>
  )
}
