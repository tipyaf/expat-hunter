type StatusType = 'success' | 'error'

interface StatusMessageProps {
  type: StatusType
  message: string
}

const typeStyles: Record<StatusType, string> = {
  success: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300',
  error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300',
}

export function StatusMessage({ type, message }: StatusMessageProps) {
  return (
    <div
      role="alert"
      className={`rounded-lg border px-4 py-3 text-sm ${typeStyles[type]}`}
    >
      {message}
    </div>
  )
}
