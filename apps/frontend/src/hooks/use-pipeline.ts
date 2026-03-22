'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useCallback, useEffect, useState } from 'react'

export interface PipelineContact {
  id: string
  fullName: string
  role: string
  email: string | null
  emailSource: 'scraped' | 'hunter' | 'apollo' | 'inferred' | 'page' | null
  emailConfidence: number | null
  emailStatus: 'verified' | 'probable' | 'unknown' | 'bounced' | null
  status: string
  relevanceScore: number | null
  relevanceLabel: string | null
  relevanceReason: string | null
  aiRecommendation: string | null
  scoreBreakdown: Record<string, { score: number; maxScore: number; explanation: string }> | null
  company: {
    id: string
    name: string
    sector: string | null
    country: string
    visaSponsorStatus: 'accredited' | 'not_found' | 'unknown' | null
    visaSponsorCountries: string[] | null
  } | null
  lastEmailStatus: string | null
  lastEmailDate: string | null
}

export interface PipelineColumn {
  key: string
  statuses: string[]
  contacts: PipelineContact[]
  count: number
}

interface BoardResponse {
  data: PipelineColumn[]
}

interface StatsResponse {
  data: Record<string, number>
}

export function usePipeline() {
  const { token } = useAuth()
  const [columns, setColumns] = useState<PipelineColumn[]>([])
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchBoard = useCallback(async () => {
    if (!token) { setIsLoading(false); return }
    try {
      setIsLoading(true)
      const res = await apiClient.get<BoardResponse>('/api/pipeline', { token })
      setColumns(res.data)
    } catch {
      // Error handled silently
    } finally {
      setIsLoading(false)
    }
  }, [token])

  const fetchStats = useCallback(async () => {
    if (!token) return
    try {
      const res = await apiClient.get<StatsResponse>('/api/pipeline/stats', { token })
      setStats(res.data)
    } catch {
      // Stats are non-critical
    }
  }, [token])

  const moveContact = useCallback(async (contactId: string, newStatus: string) => {
    if (!token) return
    await apiClient.patch(`/api/contacts/${contactId}/status`, { status: newStatus }, { token })

    setColumns((prev) => {
      const contact = prev.flatMap((c) => c.contacts).find((c) => c.id === contactId)
      if (!contact) return prev

      return prev.map((col) => {
        const without = col.contacts.filter((c) => c.id !== contactId)
        if (col.statuses.includes(newStatus)) {
          const updated = { ...contact, status: newStatus }
          return { ...col, contacts: [...without, updated], count: without.length + 1 }
        }
        return { ...col, contacts: without, count: without.length }
      })
    })
  }, [token])

  useEffect(() => {
    void fetchBoard()
    void fetchStats()
  }, [fetchBoard, fetchStats])

  const total = columns.reduce((sum, col) => sum + col.count, 0)

  return { columns, stats, total, isLoading, moveContact, refetch: fetchBoard }
}
