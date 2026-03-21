'use client'

import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/auth-context'
import { useCallback, useEffect, useState } from 'react'

interface DashboardAction {
  type: string
  count: number
  label: string
  href: string
}

interface DashboardStats {
  contacts: number
  emailsSent: number
  replies: number
}

export function useDashboard() {
  const { token } = useAuth()
  const [actions, setActions] = useState<DashboardAction[]>([])
  const [stats, setStats] = useState<DashboardStats>({ contacts: 0, emailsSent: 0, replies: 0 })
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const [actionsRes, statsRes] = await Promise.all([
        apiClient.get<{ data: DashboardAction[] }>('/api/dashboard/actions', { token }),
        apiClient.get<{ data: DashboardStats }>('/api/dashboard/stats', { token }),
      ])
      setActions(actionsRes.data)
      setStats(statsRes.data)
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { actions, stats, isLoading, refresh: fetchData }
}
