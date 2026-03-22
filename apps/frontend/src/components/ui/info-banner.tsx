import { type ReactNode } from 'react'
import { X } from 'lucide-react'

type Variant = 'info' | 'success' | 'warning' | 'error'

interface InfoBannerProps {
  variant: Variant
  title?: string
  children: ReactNode
  dismissible?: boolean
  onDismiss?: () => void
}

const variantIcons: Record<Variant, string> = {
  info: '💡',
  success: '✅',
  warning: '⚠️',
  error: '❌',
}

const variantBorderColors: Record<Variant, string> = {
  info: 'border-l-blue-500',
  success: 'border-l-green-500',
  warning: 'border-l-amber-500',
  error: 'border-l-red-500',
}

export function InfoBanner({ variant, title, children, dismissible, onDismiss }: InfoBannerProps) {
  const icon = variantIcons[variant]
  const accentBorder = variantBorderColors[variant]

  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-5 shadow-sm border-l-4 ${accentBorder}`}
    >
      <div className="flex gap-3">
        <span className="text-lg shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          {title && (
            <h2 className="text-sm font-semibold mb-2 text-[var(--color-text-main)]">{title}</h2>
          )}
          <div className="text-sm text-[var(--color-text-muted)]">{children}</div>
        </div>
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 text-[var(--color-text-muted)] opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
