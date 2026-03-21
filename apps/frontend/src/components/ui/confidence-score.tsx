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
  if (score >= 70) return 'text-green-700 bg-green-100 border-green-300 dark:text-green-400 dark:bg-green-900/30 dark:border-green-700'
  if (score >= 40) return 'text-amber-700 bg-amber-100 border-amber-300 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-700'
  return 'text-red-700 bg-red-100 border-red-300 dark:text-red-400 dark:bg-red-900/30 dark:border-red-700'
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
    ? 'w-10 h-10 text-xs'
    : 'w-12 h-12 text-sm'

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        className={`${sizeClass} ${colorClass} rounded-full border-2 font-bold flex items-center justify-center cursor-help transition-shadow hover:shadow-md`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        aria-label={`${t('confidenceScore')}: ${score}%`}
      >
        {score}%
      </button>

      {showTooltip && factors && factors.length > 0 && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-3 shadow-lg">
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0">
            <div className="border-4 border-transparent border-b-[var(--color-border)]" />
          </div>
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
        </div>
      )}
    </div>
  )
}
