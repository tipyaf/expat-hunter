import { useCallback, useEffect, useState } from 'react'
import { getOffersUnreadCount, markOffersSeen } from '@/lib/offer-notification-api'

const POLLING_INTERVAL_MS = 60_000

interface UseOfferNotificationsResult {
  unreadCount: number
  displayCount: string
  markSeen: () => Promise<void>
}

export function useOfferNotifications(): UseOfferNotificationsResult {
  const [unreadCount, setUnreadCount] = useState(0)
  const [displayCount, setDisplayCount] = useState('0')

  const fetchCount = useCallback(async (): Promise<void> => {
    try {
      const { count, display } = await getOffersUnreadCount()
      setUnreadCount(count)
      setDisplayCount(display)
    } catch {
      // Fail silently — badge not critical
    }
  }, [])

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
    try {
      await markOffersSeen()
      setUnreadCount(0)
      setDisplayCount('0')
    } catch {
      // Fail silently
    }
  }, [])

  return { unreadCount, displayCount, markSeen }
}
