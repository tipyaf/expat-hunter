'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useCallback, useEffect, useState } from 'react'

export interface BlockedEntity {
  id: string
  entityType: 'contact' | 'company'
  entityId: string
  reason: string | null
  blockedUntil: string | null
  createdAt: string
}

export function useBlocked() {
  const { token } = useAuth()
  const [blocked, setBlocked] = useState<BlockedEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!token) { setIsLoading(false); return }
    try {
      const res = await apiClient.get<{ data: BlockedEntity[] }>('/api/blocked', { token })
      setBlocked(res.data)
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }, [token])

  const unblock = async (id: string) => {
    if (!token) return
    await apiClient.delete(`/api/blocked/${id}`, { token })
    setBlocked((prev) => prev.filter((b) => b.id !== id))
  }

  useEffect(() => { void fetch() }, [fetch])

  return { blocked, isLoading, unblock, refetch: fetch }
}
