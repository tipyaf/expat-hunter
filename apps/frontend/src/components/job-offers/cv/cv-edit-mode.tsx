'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

interface CvEditModeProps {
  initialText: string
  onSave: (text: string) => Promise<void>
  onCancel: () => void
  isSaving: boolean
}

export function CvEditMode({ initialText, onSave, onCancel, isSaving }: CvEditModeProps): ReactNode {
  const t = useTranslations('cvTab')
  const [editText, setEditText] = useState(initialText)

  async function handleSave(): Promise<void> {
    const trimmed = editText.trim()
    if (!trimmed || isSaving) return
    await onSave(trimmed)
  }

  return (
    <div data-testid="cv-edit-mode" className="space-y-3">
      <label htmlFor="cv-edit-textarea" className="text-sm font-semibold text-[var(--color-text-main)]">
        {t('editTitle')}
      </label>
      <textarea
        id="cv-edit-textarea"
        data-testid="cv-edit-textarea"
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        disabled={isSaving}
        rows={16}
        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-3 text-sm text-[var(--color-text-main)] focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-50"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          data-testid="cv-edit-cancel-btn"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-surface)] disabled:opacity-50"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          data-testid="cv-edit-save-btn"
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
