'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useCallback, useEffect, useState } from 'react'

interface UseUnreadRepliesReturn {
  count: number
  isLoading: boolean
  refresh: () => void
}

export function useUnreadReplies(): UseUnreadRepliesReturn {
  const { token } = useAuth()
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const res = await apiClient.get<{ data: { count: number } }>(
        '/api/replies/unread-count',
        { token }
      )
      setCount(res.data.count)
    } catch {
      // fail silently
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    void fetch()
  }, [fetch])

  return {
    count,
    isLoading,
    refresh: () => { void fetch() },
  }
}
