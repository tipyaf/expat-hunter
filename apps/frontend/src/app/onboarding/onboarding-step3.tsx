'use client'

import { Button } from '@/components/ui/button'
import { TagInput } from '@/components/ui/tag-input'
import type { FormEvent, Ref } from 'react'
import { useTranslations } from 'next-intl'

interface RefineMessage {
  role: 'user' | 'assistant'
  content: string
}

interface OnboardingStep3Props {
  experienceYears: number
  skills: string[]
  refineMessages: RefineMessage[]
  refineInput: string
  refineSending: boolean
  chatEndRef: Ref<HTMLDivElement>
  isSubmitting: boolean
  error: string
  onExperienceChange: (value: number) => void
  onSkillsChange: (value: string[]) => void
  onRefineInputChange: (value: string) => void
  onRefineSubmit: (e: FormEvent) => void
  onBack: () => void
  onSubmit: (e: FormEvent) => void
}

export function OnboardingStep3({
  experienceYears,
  skills,
  refineMessages,
  refineInput,
  refineSending,
  chatEndRef,
  isSubmitting,
  error,
  onExperienceChange,
  onSkillsChange,
  onRefineInputChange,
  onRefineSubmit,
  onBack,
  onSubmit,
}: OnboardingStep3Props) {
  const t = useTranslations('onboarding')
  const tc = useTranslations('common')

  return (
    <form
      onSubmit={onSubmit}
      className="bg-[var(--color-surface-light)] rounded-xl border border-[var(--color-border)] p-6 space-y-5"
    >
      <h2 className="text-xl font-semibold">{t('step3Title')}</h2>

      <div>
        <label htmlFor="experienceYears" className="block text-sm font-medium mb-1">
          {t('experienceYears')}
        </label>
        <input
          id="experienceYears"
          type="number"
          min={0}
          max={50}
          value={experienceYears}
          onChange={(e) => onExperienceChange(Number.parseInt(e.target.value, 10) || 0)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <TagInput
        label={t('skills')}
        value={skills}
        onChange={onSkillsChange}
        placeholder="TypeScript, React, Node.js..."
      />

      {/* AI Refinement chat */}
      <div className="border border-[var(--color-border)] rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-1">{t('refineTitle')}</h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">{t('refineSubtitle')}</p>

        <div className="min-h-[80px] max-h-48 overflow-y-auto space-y-2 mb-3">
          {refineMessages.map((msg, i) => (
            <div
              key={i}
              className={`text-xs rounded-lg px-3 py-2 ${
                msg.role === 'user'
                  ? 'bg-primary/10 text-primary ml-4'
                  : 'bg-[var(--color-bg-light)] text-[var(--color-text)] mr-4'
              }`}
            >
              {msg.content}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={refineInput}
            onChange={(e) => onRefineInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void onRefineSubmit(e as unknown as FormEvent)
              }
            }}
            placeholder="Demandez de l'aide à l'IA..."
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
            disabled={refineSending}
          />
          <button
            type="button"
            onClick={(e) => void onRefineSubmit(e as unknown as FormEvent)}
            disabled={refineSending || !refineInput.trim()}
            className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary font-medium hover:bg-primary/20 disabled:opacity-50"
          >
            →
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-error)]">{error}</p>
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-[var(--color-text-muted)] hover:text-primary"
        >
          {t('back')}
        </button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? tc('saving') : t('finish')}
        </Button>
      </div>
    </form>
  )
}
