'use client'

import React, { useState } from 'react'
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

function getScoreStyle(score: number): React.CSSProperties {
  if (score >= 70) return { color: '#15803d', backgroundColor: '#bbf7d0', borderColor: '#22c55e' }
  if (score >= 40) return { color: '#a16207', backgroundColor: '#fde68a', borderColor: '#f59e0b' }
  return { color: '#b91c1c', backgroundColor: '#fecaca', borderColor: '#ef4444' }
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

  const scoreStyle = getScoreStyle(score)
  const sizeClass = size === 'sm'
    ? 'w-10 h-10 text-xs'
    : 'w-12 h-12 text-sm'

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        style={scoreStyle}
        className={`${sizeClass} rounded-full border-2 font-bold flex items-center justify-center cursor-help transition-shadow hover:shadow-md`}
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
