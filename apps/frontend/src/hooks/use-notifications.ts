'use client'

import { useAuth } from '@/contexts/auth-context'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface AppNotification {
  id: string
  type: 'search_completed' | 'reply_received' | 'email_sent'
  message: string
  data?: Record<string, unknown>
  read: boolean
  timestamp: number
}

export function useNotifications() {
  const { token } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    if (!token) return
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    const url = `${apiUrl}/api/notifications/stream`

    // EventSource doesn't support custom headers; use a token query param approach
    // or we pass the token via a cookie. For now use URL param as fallback.
    const es = new EventSource(`${url}?token=${encodeURIComponent(token)}`)
    eventSourceRef.current = es

    const handleEvent = (type: AppNotification['type']) => (e: MessageEvent) => {
      let data: Record<string, unknown> = {}
      let message = ''
      try {
        const parsed = JSON.parse(e.data as string) as { message?: string; type?: string; data?: Record<string, unknown> }
        message = parsed.message ?? ''
        data = parsed.data ?? {}
      } catch {
        message = e.data as string
      }

      const notification: AppNotification = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        message,
        data,
        read: false,
        timestamp: Date.now(),
      }

      setNotifications((prev) => [notification, ...prev].slice(0, 50))
    }

    es.addEventListener('search_completed', handleEvent('search_completed'))
    es.addEventListener('reply_received', handleEvent('reply_received'))
    es.addEventListener('email_sent', handleEvent('email_sent'))

    es.onerror = () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [token])

  useEffect(() => {
    connect()
    return () => {
      eventSourceRef.current?.close()
      eventSourceRef.current = null
    }
  }, [connect])

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
  }
}
