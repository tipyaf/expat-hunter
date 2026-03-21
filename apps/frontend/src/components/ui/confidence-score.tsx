'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface ConfidenceFactor {
  label: string
  impact: 'positive' | 'negative' | 'neutral'
  weight: number
}

interface ConfidenceScoreProps {
  score: number
  factors?: ConfidenceFactor[]
  size?: 'sm' | 'md'
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800'
  if (score >= 40) return 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800'
  return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800'
}

function getFactorIcon(impact: string): string {
  if (impact === 'positive') return '+'
  if (impact === 'negative') return '-'
  return '~'
}

function getFactorColor(impact: string): string {
  if (impact === 'positive') return 'text-green-600 dark:text-green-400'
  if (impact === 'negative') return 'text-red-600 dark:text-red-400'
  return 'text-[var(--color-text-muted)]'
}

export function ConfidenceScore({ score, factors, size = 'sm' }: ConfidenceScoreProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const t = useTranslations('contacts')

  const colorClass = getScoreColor(score)
  const sizeClass = size === 'sm'
    ? 'w-9 h-9 text-xs'
    : 'w-12 h-12 text-sm'

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        className={`${sizeClass} ${colorClass} rounded-full border font-semibold flex items-center justify-center cursor-help transition-shadow hover:shadow-md`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        aria-label={`${t('confidenceScore')}: ${score}%`}
      >
        {score}%
      </button>

      {showTooltip && factors && factors.length > 0 && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-3 shadow-lg">
          <p className="text-xs font-semibold text-[var(--color-text-main)] mb-2">
            {t('confidenceScore')} — {score}%
          </p>
          <ul className="space-y-1">
            {factors.map((factor, i) => (
              <li key={i} className={`text-xs flex items-center gap-1.5 ${getFactorColor(factor.impact)}`}>
                <span className="font-mono font-bold w-3 text-center">{getFactorIcon(factor.impact)}</span>
                {factor.label}
              </li>
            ))}
          </ul>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-[var(--color-border)]" />
          </div>
        </div>
      )}
    </div>
  )
}
