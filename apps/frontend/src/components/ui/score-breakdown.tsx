'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface SubScore {
  score: number
  maxScore: number
  explanation: string
}

type ScoreBreakdownData = Record<string, SubScore>

const DIMENSION_ORDER = ['visa', 'role', 'hiring', 'expatFriendly', 'momentum'] as const
type Dimension = typeof DIMENSION_ORDER[number]

const DIMENSION_COLORS: Record<Dimension, string> = {
  visa:         'bg-green-500',
  role:         'bg-blue-500',
  hiring:       'bg-indigo-500',
  expatFriendly:'bg-teal-500',
  momentum:     'bg-orange-500',
}

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownData | null | undefined
  totalScore?: number | null
  className?: string
}

export function ScoreBreakdown({ breakdown, totalScore, className = '' }: ScoreBreakdownProps) {
  const t = useTranslations('badges')
  const [expanded, setExpanded] = useState(false)

  if (!breakdown) return null

  const dimensions = DIMENSION_ORDER.filter((d) => d in breakdown)
  if (dimensions.length === 0) return null

  const total = totalScore ?? dimensions.reduce((sum, d) => sum + breakdown[d].score, 0)
  const maxTotal = dimensions.reduce((sum, d) => sum + breakdown[d].maxScore, 0)
  const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0

  const scoreColor =
    pct >= 70 ? 'text-green-600' :
    pct >= 45 ? 'text-orange-600' :
    'text-red-600'

  return (
    <div className={`w-full ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full text-left group"
        aria-expanded={expanded}
      >
        <span className="text-xs font-semibold text-[var(--color-text-muted)] group-hover:text-[var(--color-text-main)] transition-colors">
          {t('scoreBreakdownLabel')}
        </span>
        <span className={`text-xs font-bold ${scoreColor}`}>
          {total}/{maxTotal}
          <span className="text-[var(--color-text-muted)] font-normal ml-1">({pct}%)</span>
          <span className="ml-1 text-[var(--color-text-muted)]">{expanded ? '▲' : '▼'}</span>
        </span>
      </button>

      {/* Mini bar always visible */}
      <div className="flex gap-0.5 mt-1.5 h-1 rounded-full overflow-hidden bg-[var(--color-border)]">
        {dimensions.map((dim) => {
          const sub = breakdown[dim]
          const widthPct = maxTotal > 0 ? (sub.maxScore / maxTotal) * 100 : 0
          const fillPct = sub.maxScore > 0 ? (sub.score / sub.maxScore) * 100 : 0
          const barColor = DIMENSION_COLORS[dim]
          return (
            <div key={dim} style={{ width: `${widthPct}%` }} className="relative bg-[var(--color-border)]">
              <div
                className={`absolute inset-y-0 left-0 ${barColor} transition-all duration-500`}
                style={{ width: `${fillPct}%` }}
              />
            </div>
          )
        })}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 space-y-2">
          {dimensions.map((dim) => {
            const sub = breakdown[dim]
            const fillPct = sub.maxScore > 0 ? (sub.score / sub.maxScore) * 100 : 0
            const barColor = DIMENSION_COLORS[dim]
            return (
              <div key={dim}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
                    {t(`dim_${dim}`)}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {sub.score}/{sub.maxScore}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor} transition-all duration-500`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                <p className="text-[10px] text-[var(--color-text-subtle)] mt-0.5 leading-tight">
                  {sub.explanation}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
