'use client'

import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

const SCORE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 60,
  LOW: 40,
} as const

function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.HIGH) return 'var(--color-success)'
  if (score >= SCORE_THRESHOLDS.MEDIUM) return 'var(--color-warning)'
  if (score >= SCORE_THRESHOLDS.LOW) return 'var(--color-info)'
  return 'var(--color-text-muted)'
}

interface ScoreProgressBarProps {
  score: number
}

export function ScoreProgressBar({ score }: ScoreProgressBarProps): ReactNode {
  const t = useTranslations('jobOfferDetailPage')
  const color = getScoreColor(score)

  return (
    <div data-testid="job-offer-detail-score" className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[var(--color-text-main)]">{t('score')}</span>
        <span className="font-semibold" style={{ color }}>{score}%</span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
        <progress
          value={score}
          max={100}
          aria-label={t('scoreAriaLabel', { score })}
          className="sr-only"
        >
          {score}%
        </progress>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
          style={{ width: `${score}%`, backgroundColor: color }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
