'use client'

import type { ReactNode } from 'react'

const SKELETON_COUNT = 3

export function JobOfferCardSkeleton(): ReactNode {
  return (
    <div
      data-testid="job-offer-card-skeleton"
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 animate-pulse"
    >
      {/* Title + score */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-3/4 rounded bg-[var(--color-surface-raised)]" />
          <div className="h-3 w-1/2 rounded bg-[var(--color-surface-raised)]" />
        </div>
        <div className="h-6 w-10 rounded-full bg-[var(--color-surface-raised)]" />
      </div>

      {/* Summary */}
      <div className="h-3 w-full rounded bg-[var(--color-surface-raised)] mb-3" />

      {/* Meta row */}
      <div className="flex gap-3 mb-3">
        <div className="h-3 w-24 rounded bg-[var(--color-surface-raised)]" />
        <div className="h-3 w-20 rounded bg-[var(--color-surface-raised)]" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-28 rounded bg-[var(--color-surface-raised)]" />
        <div className="h-6 w-16 rounded bg-[var(--color-surface-raised)]" />
      </div>
    </div>
  )
}

export function JobOfferCardSkeletonList(): ReactNode {
  return (
    <div className="grid gap-3" data-testid="job-offer-skeleton-list">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <JobOfferCardSkeleton key={i} />
      ))}
    </div>
  )
}
