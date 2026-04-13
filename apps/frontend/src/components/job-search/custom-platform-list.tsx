'use client'

import { Trash2, Globe } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { CustomPlatform } from '@/hooks/use-custom-platforms'

interface CustomPlatformListProps {
  platforms: CustomPlatform[]
  onDelete: (id: string) => void
}

export function CustomPlatformList({ platforms, onDelete }: Readonly<CustomPlatformListProps>) {
  const t = useTranslations('customPlatforms')

  if (platforms.length === 0) {
    return (
      <p
        data-testid="custom-platform-empty"
        className="text-sm text-[var(--color-text-muted)] py-2"
      >
        {t('emptyList')}
      </p>
    )
  }

  return (
    <ul data-testid="custom-platform-list" className="space-y-2">
      {platforms.map((platform) => (
        <li
          key={platform.id}
          data-testid="custom-platform-item"
          className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Globe className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-main)] truncate">
                {platform.name}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] truncate">
                {platform.url}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDelete(platform.id)}
            data-testid="custom-platform-delete-btn"
            className="shrink-0 rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)]"
            aria-label={t('deletePlatform', { name: platform.name })}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  )
}
