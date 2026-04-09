import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { CvReplacementCard } from './cv-replacement-card'
import type { CvReplacement } from '@/lib/job-cv-api'

interface CvDiffViewProps {
  cvText: string
  replacements: CvReplacement[]
}

export function CvDiffView({ cvText, replacements }: CvDiffViewProps): ReactNode {
  const t = useTranslations('cvTab')

  if (replacements.length === 0) {
    return (
      <div
        data-testid="cv-no-replacements"
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 text-center"
      >
        <p className="text-sm text-[var(--color-text-muted)]">{t('noReplacements')}</p>
      </div>
    )
  }

  return (
    <div data-testid="cv-diff-view" className="space-y-4">
      {/* Replacements list */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--color-text-main)]">
          {t('replacementsTitle')} ({replacements.length})
        </h3>
        <div className="space-y-2">
          {replacements.map((replacement, index) => (
            <CvReplacementCard key={index} replacement={replacement} index={index} />
          ))}
        </div>
      </div>

      {/* Adapted CV preview */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--color-text-main)]">{t('adaptedCvTitle')}</h3>
        <div
          data-testid="cv-text-preview"
          className="max-h-96 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4"
        >
          <p className="whitespace-pre-wrap text-sm text-[var(--color-text-main)]">{cvText}</p>
        </div>
      </div>
    </div>
  )
}
