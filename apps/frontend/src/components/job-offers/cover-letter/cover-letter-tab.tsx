'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useJobCoverLetter } from '@/hooks/use-job-cover-letter'
import type { ReactNode } from 'react'

const MAX_INSTRUCTION_LENGTH = 2000

interface CoverLetterTabProps {
  readonly offerId: string
  readonly token: string
}

/* ---------- Sub-components (keep complexity per function ≤ 15) ---------- */

function RefineInput({
  onRefine,
  isRefining,
}: {
  readonly onRefine: (instruction: string) => Promise<void>
  readonly isRefining: boolean
}): ReactNode {
  const t = useTranslations('coverLetterTab')
  const [instruction, setInstruction] = useState('')

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const trimmed = instruction.trim()
    if (!trimmed || isRefining) return
    await onRefine(trimmed)
    setInstruction('')
  }

  return (
    <form
      data-testid="cl-refine-form"
      onSubmit={(e) => void handleSubmit(e)}
      className="space-y-2"
    >
      <label htmlFor="cl-refine-instruction" className="text-sm font-medium text-[var(--color-text-main)]">
        {t('refineLabel')}
      </label>
      <textarea
        id="cl-refine-instruction"
        data-testid="cl-refine-instruction-input"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder={t('refinePlaceholder')}
        maxLength={MAX_INSTRUCTION_LENGTH}
        rows={3}
        disabled={isRefining}
        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-3 text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-50"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-muted)]">
          {instruction.length}/{MAX_INSTRUCTION_LENGTH}
        </span>
        <button
          type="submit"
          data-testid="cl-refine-btn"
          disabled={!instruction.trim() || isRefining}
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRefining ? t('refining') : t('refineBtn')}
        </button>
      </div>
    </form>
  )
}

function EditMode({
  initialText,
  onSave,
  onCancel,
  isSaving,
}: {
  readonly initialText: string
  readonly onSave: (text: string) => Promise<void>
  readonly onCancel: () => void
  readonly isSaving: boolean
}): ReactNode {
  const t = useTranslations('coverLetterTab')
  const [editText, setEditText] = useState(initialText)

  async function handleSave(): Promise<void> {
    const trimmed = editText.trim()
    if (!trimmed || isSaving) return
    await onSave(trimmed)
  }

  return (
    <div data-testid="cl-edit-mode" className="space-y-3">
      <label htmlFor="cl-edit-textarea" className="text-sm font-semibold text-[var(--color-text-main)]">
        {t('editTitle')}
      </label>
      <textarea
        id="cl-edit-textarea"
        data-testid="cl-edit-textarea"
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        disabled={isSaving}
        rows={16}
        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-3 text-sm text-[var(--color-text-main)] focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-50"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          data-testid="cl-edit-cancel-btn"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-surface)] disabled:opacity-50"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          data-testid="cl-edit-save-btn"
          onClick={() => void handleSave()}
          disabled={!editText.trim() || isSaving}
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? t('saving') : t('save')}
        </button>
      </div>
    </div>
  )
}

/* ---------- Main component ---------- */

export function CoverLetterTab({ offerId, token }: CoverLetterTabProps): ReactNode {
  const t = useTranslations('coverLetterTab')
  const {
    application,
    coverLetterText,
    isLoading,
    isGenerating,
    isRefining,
    isSaving,
    isDownloading,
    error,
    quotaExceeded,
    noCv,
    generateCoverLetter,
    refineCoverLetter,
    saveCoverLetter,
    downloadPdf,
    clearError,
  } = useJobCoverLetter(offerId, token)

  const [isEditing, setIsEditing] = useState(false)

  const handleSave = useCallback(async (text: string): Promise<void> => {
    await saveCoverLetter(text)
    setIsEditing(false)
  }, [saveCoverLetter])

  const handleCancelEdit = useCallback((): void => {
    setIsEditing(false)
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="cl-tab-loading" className="space-y-3 animate-pulse">
        <div className="h-8 w-48 rounded bg-[var(--color-border)]" />
        <div className="h-32 rounded bg-[var(--color-border)]" />
      </div>
    )
  }

  // Error banner (generic errors only — quota/noCv have their own displays)
  const errorBanner = error && !quotaExceeded && !noCv ? (
    <div
      data-testid="cl-error"
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

  // No cover letter generated yet — initial state
  if (!application?.coverLetterText) {
    return (
      <div data-testid="cl-tab" className="space-y-4">
        {errorBanner}

        {noCv && (
          <div
            data-testid="cl-no-profile-cv"
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 text-center"
          >
            <p className="text-sm text-[var(--color-text-muted)]">{t('noCvInProfile')}</p>
          </div>
        )}

        {quotaExceeded && (
          <div
            data-testid="cl-quota-exceeded"
            className="rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-4 text-center"
          >
            <p className="text-sm text-[var(--color-error)]">{t('quotaExceeded')}</p>
          </div>
        )}

        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6 text-center space-y-3">
          <p className="text-sm text-[var(--color-text-muted)]">{t('generateDescription')}</p>
          <button
            type="button"
            data-testid="generate-cl-btn"
            onClick={() => void generateCoverLetter()}
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

  // Cover letter generated — show text display, edit mode, or actions
  return (
    <div data-testid="cl-tab" className="space-y-4">
      {errorBanner}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {!isEditing && (
          <>
            <button
              type="button"
              data-testid="cl-edit-btn"
              onClick={() => setIsEditing(true)}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-surface)]"
            >
              {t('editBtn')}
            </button>
            <button
              type="button"
              data-testid="cl-download-pdf-btn"
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

      {/* Edit mode or text display */}
      {isEditing ? (
        <EditMode
          initialText={coverLetterText ?? ''}
          onSave={handleSave}
          onCancel={handleCancelEdit}
          isSaving={isSaving}
        />
      ) : (
        <>
          <div
            data-testid="cl-text-display"
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4"
          >
            <p className="whitespace-pre-wrap text-sm text-[var(--color-text-main)]">
              {coverLetterText}
            </p>
          </div>
          <RefineInput onRefine={refineCoverLetter} isRefining={isRefining} />
        </>
      )}
    </div>
  )
}
