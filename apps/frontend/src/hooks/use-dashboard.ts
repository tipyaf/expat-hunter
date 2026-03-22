'use client'

import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/auth-context'
import { useCallback, useEffect, useState } from 'react'

export interface DashboardAction {
  type: string
  count: number
  label: string
  href: string
}

export interface DashboardStats {
  contacts: number
  emailsSent: number
  replies: number
  responseRate: number
  interviews: number
}

export interface ContextualTip {
  message: string
  cta?: { label: string; href: string }
}

export function useDashboard() {
  const { token } = useAuth()
  const [actions, setActions] = useState<DashboardAction[]>([])
  const [stats, setStats] = useState<DashboardStats>({ contacts: 0, emailsSent: 0, replies: 0, responseRate: 0, interviews: 0 })
  const [tip, setTip] = useState<ContextualTip | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const [actionsRes, statsRes, tipRes] = await Promise.all([
        apiClient.get<{ data: DashboardAction[] }>('/api/dashboard/actions', { token }),
        apiClient.get<{ data: DashboardStats }>('/api/dashboard/stats', { token }),
        apiClient.get<{ data: ContextualTip }>('/api/tips/contextual?page=dashboard', { token }),
      ])
      setActions(actionsRes.data)
      setStats(statsRes.data)
      setTip(tipRes.data)
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { actions, stats, tip, isLoading, refresh: fetchData }
}
