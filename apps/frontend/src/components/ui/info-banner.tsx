import { type ReactNode } from 'react'
import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react'

type Variant = 'info' | 'success' | 'warning' | 'error'

interface InfoBannerProps {
  variant: Variant
  title?: string
  children: ReactNode
  icon?: ReactNode
  dismissible?: boolean
  onDismiss?: () => void
}

const variantStyles: Record<Variant, { container: string; title: string; body: string }> = {
  info: {
    container: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30',
    title: 'text-blue-800 dark:text-blue-300',
    body: 'text-blue-700 dark:text-blue-400',
  },
  success: {
    container: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30',
    title: 'text-green-800 dark:text-green-300',
    body: 'text-green-700 dark:text-green-400',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
    title: 'text-amber-800 dark:text-amber-300',
    body: 'text-amber-700 dark:text-amber-400',
  },
  error: {
    container: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
    title: 'text-red-800 dark:text-red-300',
    body: 'text-red-700 dark:text-red-400',
  },
}

const defaultIcons: Record<Variant, ReactNode> = {
  info: <Info className="w-4 h-4 shrink-0 mt-0.5" />,
  success: <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />,
  error: <XCircle className="w-4 h-4 shrink-0 mt-0.5" />,
}

export function InfoBanner({ variant, title, children, icon, dismissible, onDismiss }: InfoBannerProps) {
  const styles = variantStyles[variant]
  const displayIcon = icon ?? defaultIcons[variant]

  return (
    <div className={`rounded-xl border p-5 ${styles.container}`}>
      <div className="flex gap-3">
        <span className={styles.title}>{displayIcon}</span>
        <div className="flex-1 min-w-0">
          {title && (
            <h2 className={`text-sm font-semibold mb-2 ${styles.title}`}>{title}</h2>
          )}
          <div className={`text-sm ${styles.body}`}>{children}</div>
        </div>
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={`shrink-0 ${styles.title} opacity-60 hover:opacity-100 transition-opacity`}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
