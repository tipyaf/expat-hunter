'use client'

import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

interface OnboardingStep2Props {
  hasCv: boolean
  cvUploading: boolean
  cvMessage: string
  isSubmitting: boolean
  onCvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBack: () => void
  onSkip: () => void
  onNext: () => void
}

export function OnboardingStep2({
  hasCv,
  cvUploading,
  cvMessage,
  isSubmitting,
  onCvUpload,
  onBack,
  onSkip,
  onNext,
}: OnboardingStep2Props) {
  const t = useTranslations('onboarding')
  const tc = useTranslations('common')

  return (
    <div className="bg-[var(--color-surface-light)] rounded-xl border border-[var(--color-border)] p-6 space-y-5">
      <h2 className="text-xl font-semibold">{t('step2Title')}</h2>

      {hasCv ? (
        <p className="text-sm text-primary font-medium">
          {t('cvParsed')}
        </p>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">
          {t('cvUpload')}
        </p>
      )}

      {cvMessage && (
        <p className="text-sm text-primary">{cvMessage}</p>
      )}

      <label
        htmlFor="cv-onboarding"
        className="inline-flex cursor-pointer items-center rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-primary/5 transition-colors"
      >
        {cvUploading ? tc('saving') : t('cvUpload')}
        <input
          id="cv-onboarding"
          type="file"
          accept=".pdf,.txt"
          onChange={onCvUpload}
          className="hidden"
          disabled={cvUploading}
        />
      </label>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-[var(--color-text-muted)] hover:text-primary"
        >
          {t('back')}
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-[var(--color-text-muted)] hover:text-primary"
          >
            {t('step2Skip')}
          </button>
          <Button type="button" onClick={onNext} disabled={isSubmitting}>
            {t('next')}
          </Button>
        </div>
      </div>
    </div>
  )
}
