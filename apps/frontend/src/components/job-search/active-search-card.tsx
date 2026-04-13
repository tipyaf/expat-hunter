'use client'

import type { JobSearch } from '@/hooks/use-job-searches'
import { Play, Pencil, Trash2, Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ActiveSearchCardProps {
  search: JobSearch
  onEdit: () => void
  onDelete: () => void
  onRun: () => void
  isRunning?: boolean
}

function formatRelativeTime(dateStr: string | null, t: ReturnType<typeof useTranslations>): string {
  if (!dateStr) return t('neverRun')
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return t('justNow')
  if (diffMinutes < 60) return t('minutesAgo', { count: diffMinutes })
  if (diffHours < 24) return t('hoursAgo', { count: diffHours })
  return t('daysAgo', { count: diffDays })
}

function formatNextRunDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ActiveSearchCard({ search, onEdit, onDelete, onRun, isRunning }: Readonly<ActiveSearchCardProps>) {
  const t = useTranslations('jobSearch')

  return (
    <div
      data-testid="job-search-active-card"
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Roles */}
          <div>
            <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              {t('rolesLabel')}
            </span>
            <p data-testid="job-search-roles" className="mt-0.5 text-sm font-semibold text-[var(--color-text-main)]">
              {search.roles.join(', ')}
            </p>
          </div>

          {/* Countries & Platforms */}
          <div className="flex flex-wrap gap-6">
            <div>
              <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                {t('countriesLabel')}
              </span>
              <p className="mt-0.5 text-sm text-[var(--color-text-main)]">
                {search.countries.join(', ')}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                {t('platformsLabel')}
              </span>
              <p className="mt-0.5 text-sm text-[var(--color-text-main)]">
                {search.platforms.join(', ')}
              </p>
            </div>
          </div>

          {/* Frequency badge + Last run + Next run */}
          <div className="flex items-center flex-wrap gap-4 text-xs text-[var(--color-text-muted)]">
            {search.frequency !== 'manual' && (
              <span
                data-testid="job-search-frequency-badge"
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]"
              >
                <Clock className="h-3 w-3" aria-hidden="true" />
                {t(`frequency_${search.frequency}`)}
              </span>
            )}
            <span data-testid="job-search-last-run">
              {t('lastRun')}: {formatRelativeTime(search.lastRunAt, t)}
            </span>
            {search.frequency !== 'manual' && search.nextRunAt && (
              <span data-testid="job-search-next-run">
                {t('nextRun')}: {formatNextRunDate(search.nextRunAt)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={onRun}
            disabled={isRunning}
            data-testid="job-search-run-now-button"
            className="flex items-center gap-2 rounded-[var(--radius-md)] bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            {isRunning ? t('running') : t('runNow')}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              data-testid="job-search-edit-btn"
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-main)]"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              {t('edit')}
            </button>
            <button
              type="button"
              onClick={onDelete}
              data-testid="job-search-delete-btn"
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] hover:border-[var(--color-error)]/30"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t('delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
