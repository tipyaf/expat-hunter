import type { ReactNode } from 'react'

const MAX_DISPLAY_COUNT = 99

interface NotificationBadgeProps {
  count: number
}

export function NotificationBadge({ count }: NotificationBadgeProps): ReactNode {
  if (count <= 0) {
    return null
  }

  const displayText = count > MAX_DISPLAY_COUNT ? `${MAX_DISPLAY_COUNT}+` : String(count)

  return (
    <span
      data-testid="notification-badge"
      className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-error)] px-1.5 text-[10px] font-bold text-white"
    >
      {displayText}
    </span>
  )
}
