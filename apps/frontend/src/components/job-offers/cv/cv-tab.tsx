'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useJobCv } from '@/hooks/use-job-cv'
import { CvDiffView } from './cv-diff-view'
import { CvRefineInput } from './cv-refine-input'
import { CvEditMode } from './cv-edit-mode'
import type { ReactNode } from 'react'

interface CvTabProps {
  readonly offerId: string
  readonly token: string
}

export function CvTab({ offerId, token }: CvTabProps): ReactNode {
  const t = useTranslations('cvTab')
  const {
    application,
    cvText,
    cvReplacements,
    isLoading,
    isGenerating,
    isRefining,
    isSaving,
    isDownloading,
    error,
    quotaExceeded,
    noCv,
    generateCv,
    refineCv,
    saveCv,
    downloadPdf,
    clearError,
  } = useJobCv(offerId, token)

  const [isEditing, setIsEditing] = useState(false)

  const handleSave = useCallback(async (text: string): Promise<void> => {
    await saveCv(text)
    setIsEditing(false)
  }, [saveCv])

  const handleCancelEdit = useCallback((): void => {
    setIsEditing(false)
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="cv-tab-loading" className="space-y-3 animate-pulse">
        <div className="h-8 w-48 rounded bg-[var(--color-border)]" />
        <div className="h-32 rounded bg-[var(--color-border)]" />
      </div>
    )
  }

  // Error display
  const errorBanner = error && !quotaExceeded && !noCv ? (
    <div
      data-testid="cv-error"
      className="rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-3"
    >
      <p className="text-sm text-[var(--color-error)]">{error}</p>
      <button
        type="button"
        onClick={clearError}
        className="mt-1 text-xs text-[var(--color-primary)] hover:underline"
      >
        {t('dismiss')}
      </button>
    </div>
  ) : null

  // No CV generated yet — initial state
  if (!application?.cvText) {
    return (
      <div data-testid="cv-tab" className="space-y-4">
        {errorBanner}

        {noCv && (
          <div
            data-testid="cv-no-profile-cv"
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 text-center"
          >
            <p className="text-sm text-[var(--color-text-muted)]">{t('noCvInProfile')}</p>
          </div>
        )}

        {quotaExceeded && (
          <div
            data-testid="cv-quota-exceeded"
            className="rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-4 text-center"
          >
            <p className="text-sm text-[var(--color-error)]">{t('quotaExceeded')}</p>
          </div>
        )}

        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6 text-center space-y-3">
          <p className="text-sm text-[var(--color-text-muted)]">{t('generateDescription')}</p>
          <button
            type="button"
            data-testid="generate-cv-btn"
            onClick={() => void generateCv()}
            disabled={isGenerating || quotaExceeded}
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t('generating')}
              </span>
            ) : (
              t('generateBtn')
            )}
          </button>
        </div>
      </div>
    )
  }

  // CV generated — show diff view, edit mode, or actions
  return (
    <div data-testid="cv-tab" className="space-y-4">
      {errorBanner}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {!isEditing && (
          <>
            <button
              type="button"
              data-testid="cv-edit-btn"
              onClick={() => setIsEditing(true)}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-surface)]"
            >
              {t('editBtn')}
            </button>
            <button
              type="button"
              data-testid="cv-download-pdf-btn"
              onClick={() => void downloadPdf()}
              disabled={isDownloading}
              className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isDownloading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t('downloading')}
                </span>
              ) : (
                t('downloadPdf')
              )}
            </button>
          </>
        )}
      </div>

      {/* Edit mode or diff view */}
      {isEditing ? (
        <CvEditMode
          initialText={cvText ?? ''}
          onSave={handleSave}
          onCancel={handleCancelEdit}
          isSaving={isSaving}
        />
      ) : (
        <>
          <CvDiffView cvText={cvText ?? ''} replacements={cvReplacements} />
          <CvRefineInput onRefine={refineCv} isRefining={isRefining} />
        </>
      )}
    </div>
  )
}
