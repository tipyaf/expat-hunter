import type { ReactNode } from 'react'
import type { CvReplacement } from '@/lib/job-cv-api'

interface CvReplacementCardProps {
  readonly replacement: CvReplacement
  readonly index: number
}

export function CvReplacementCard({ replacement, index }: CvReplacementCardProps): ReactNode {
  return (
    <div
      data-testid={`replacement-card-${index}`}
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-3 space-y-2"
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 rounded bg-[var(--color-error)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--color-error)]">
          −
        </span>
        <p
          data-testid={`replacement-old-${index}`}
          className="text-sm text-[var(--color-text-muted)] line-through"
        >
          {replacement.oldText}
        </p>
      </div>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 rounded bg-[var(--color-success)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--color-success)]">
          +
        </span>
        <p
          data-testid={`replacement-new-${index}`}
          className="text-sm font-medium text-[var(--color-text-main)]"
        >
          {replacement.newText}
        </p>
      </div>
    </div>
  )
}
