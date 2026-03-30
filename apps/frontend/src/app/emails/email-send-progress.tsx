'use client'

import { useTranslations } from 'next-intl'

export interface SendProgress {
  batchId: string
  status: 'running' | 'completed' | 'failed'
  total: number
  sent: number
  failed: number
}

export interface EmailSendProgressProps {
  sendProgress: SendProgress | null
}

export function EmailSendProgress({ sendProgress }: EmailSendProgressProps) {
  const t = useTranslations('emails')

  if (!sendProgress || sendProgress.status !== 'running') return null

  return (
    <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-light)] px-4 py-3">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-[var(--color-text-main)] font-medium">{t('sending')}</span>
        <span className="text-[var(--color-text-muted)]">{sendProgress.sent}/{sendProgress.total}</span>
      </div>
      <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${sendProgress.total > 0 ? Math.round((sendProgress.sent / sendProgress.total) * 100) : 0}%` }}
        />
      </div>
    </div>
  )
}
