'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { useRef, useEffect, type ReactNode } from 'react'

interface CollapsibleNavGroupProps {
  label: string
  isOpen: boolean
  onToggle: () => void
  badge?: number
  children: ReactNode
}

/**
 * Collapsible navigation group with chevron toggle, badge, and animated expand/collapse.
 * Uses semantic HTML (ul for children) and ARIA attributes.
 */
export function CollapsibleNavGroup({
  label,
  isOpen,
  onToggle,
  badge,
  children,
}: CollapsibleNavGroupProps): ReactNode {
  const contentRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    if (isOpen) {
      el.style.maxHeight = `${el.scrollHeight}px`
    } else {
      el.style.maxHeight = '0px'
    }
  }, [isOpen])

  const ChevronIcon = isOpen ? ChevronDown : ChevronRight

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] transition-colors hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-main)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <ChevronIcon className="h-3.5 w-3.5 shrink-0 transition-transform" aria-hidden="true" />
        <span className="flex-1 text-left">{label}</span>
        {badge != null && badge > 0 && (
          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
      <ul
        ref={contentRef}
        role="list"
        className="overflow-hidden transition-[max-height] duration-150 ease-in-out"
        style={{ maxHeight: isOpen ? undefined : '0px' }}
      >
        {children}
      </ul>
    </div>
  )
}
