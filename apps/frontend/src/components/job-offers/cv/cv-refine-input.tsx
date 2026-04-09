'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

const MAX_INSTRUCTION_LENGTH = 2000

interface CvRefineInputProps {
  readonly onRefine: (instruction: string) => Promise<void>
  readonly isRefining: boolean
}

export function CvRefineInput({ onRefine, isRefining }: CvRefineInputProps): ReactNode {
  const t = useTranslations('cvTab')
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
      data-testid="cv-refine-form"
      onSubmit={(e) => void handleSubmit(e)}
      className="space-y-2"
    >
      <label htmlFor="refine-instruction" className="text-sm font-medium text-[var(--color-text-main)]">
        {t('refineLabel')}
      </label>
      <textarea
        id="refine-instruction"
        data-testid="refine-instruction-input"
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
          data-testid="refine-cv-btn"
          disabled={!instruction.trim() || isRefining}
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRefining ? t('refining') : t('refineBtn')}
        </button>
      </div>
    </form>
  )
}
