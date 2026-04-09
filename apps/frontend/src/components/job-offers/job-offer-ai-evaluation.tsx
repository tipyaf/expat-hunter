'use client'

import { useTranslations } from 'next-intl'
import { ScoreProgressBar } from './score-progress-bar'
import { useState, useCallback } from 'react'
import { Pencil, Save, X } from 'lucide-react'
import type { ReactNode } from 'react'

const ADVICE_MAX_LENGTH = 2000

interface JobOfferAiEvaluationProps {
  score: number | null
  matchSummary: string | null
  selectionReason: string | null
  applicationAdvice: string | null
  onAdviceSave: (advice: string) => Promise<void>
}

export function JobOfferAiEvaluation({
  score,
  matchSummary,
  selectionReason,
  applicationAdvice,
  onAdviceSave,
}: JobOfferAiEvaluationProps): ReactNode {
  const t = useTranslations('jobOfferDetailPage')
  const [isEditing, setIsEditing] = useState(false)
  const [adviceText, setAdviceText] = useState(applicationAdvice ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = useCallback(async (): Promise<void> => {
    if (!adviceText.trim()) return
    setIsSaving(true)
    try {
      await onAdviceSave(adviceText.trim())
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }, [adviceText, onAdviceSave])

  const handleCancel = useCallback((): void => {
    setAdviceText(applicationAdvice ?? '')
    setIsEditing(false)
  }, [applicationAdvice])

  return (
    <div
      data-testid="job-offer-ai-evaluation"
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 space-y-4"
    >
      <h3 className="font-semibold text-[var(--color-text-main)]">{t('aiEvaluation')}</h3>

      {score !== null && <ScoreProgressBar score={score} />}

      {matchSummary && (
        <div data-testid="match-summary" className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            {t('matchSummaryLabel')}
          </p>
          <p className="text-sm text-[var(--color-text-main)]">{matchSummary}</p>
        </div>
      )}

      {selectionReason && (
        <div data-testid="selection-reason" className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            {t('selectionReasonLabel')}
          </p>
          <p className="text-sm text-[var(--color-text-main)]">{selectionReason}</p>
        </div>
      )}

      {/* Application advice — editable */}
      <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            {t('adviceLabel')}
          </p>
          {!isEditing && (
            <button
              type="button"
              data-testid="advice-edit-button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Pencil size={12} aria-hidden="true" />
              {t('edit')}
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              data-testid="advice-textarea"
              value={adviceText}
              onChange={(e) => setAdviceText(e.target.value)}
              maxLength={ADVICE_MAX_LENGTH}
              rows={4}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm text-[var(--color-text-main)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="advice-save-button"
                onClick={() => void handleSave()}
                disabled={isSaving || !adviceText.trim()}
                className="inline-flex items-center gap-1 rounded-[var(--radius-md)] bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                <Save size={12} aria-hidden="true" />
                {isSaving ? t('saving') : t('save')}
              </button>
              <button
                type="button"
                data-testid="advice-cancel-button"
                onClick={handleCancel}
                className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
              >
                <X size={12} aria-hidden="true" />
                {t('cancel')}
              </button>
            </div>
          </div>
        ) : (
          <p data-testid="advice-text" className="text-sm text-[var(--color-text-main)]">
            {applicationAdvice ?? t('noAdvice')}
          </p>
        )}
      </div>
    </div>
  )
}
