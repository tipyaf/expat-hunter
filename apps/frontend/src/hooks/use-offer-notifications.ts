import { useCallback, useEffect, useState } from 'react'
import { getOffersUnreadCount, markOffersSeen } from '@/lib/offer-notification-api'
import { useAuth } from '@/contexts/auth-context'

const POLLING_INTERVAL_MS = 60_000

interface UseOfferNotificationsResult {
  unreadCount: number
  displayCount: string
  markSeen: () => Promise<void>
}

export function useOfferNotifications(): UseOfferNotificationsResult {
  const { token } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [displayCount, setDisplayCount] = useState('0')

  const fetchCount = useCallback(async (): Promise<void> => {
    if (!token) return
    try {
      const { count, display } = await getOffersUnreadCount(token)
      setUnreadCount(count)
      setDisplayCount(display)
    } catch {
      // Fail silently — badge not critical
    }
  }, [token])

  useEffect(() => {
    void fetchCount()
    const interval = setInterval(() => {
      if (!document.hidden) {
        void fetchCount()
      }
    }, POLLING_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchCount])

  const markSeen = useCallback(async (): Promise<void> => {
    if (!token) return
    try {
      await markOffersSeen(token)
      setUnreadCount(0)
      setDisplayCount('0')
    } catch {
      // Fail silently
    }
  }, [token])

  return { unreadCount, displayCount, markSeen }
}
