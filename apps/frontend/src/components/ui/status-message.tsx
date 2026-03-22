type StatusType = 'success' | 'error'

interface StatusMessageProps {
  type: StatusType
  message: string
}

const typeIcons: Record<StatusType, string> = {
  success: '✅',
  error: '❌',
}

const typeTextColors: Record<StatusType, string> = {
  success: 'text-[var(--color-success)]',
  error: 'text-[var(--color-error)]',
}

export function StatusMessage({ type, message }: StatusMessageProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-light)] px-4 py-3"
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-sm">{typeIcons[type]}</span>
        <span className={`text-sm ${typeTextColors[type]}`}>{message}</span>
      </div>
    </div>
  )
}
