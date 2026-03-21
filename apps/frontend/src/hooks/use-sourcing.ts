'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useCallback, useEffect, useState } from 'react'

export interface SourcingRun {
  id: string
  userId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  country: string
  sector: string | null
  sources: string[]
  contactsFound: number
  startedAt: string | null
  completedAt: string | null
  errors: Record<string, string> | null
  createdAt: string
  updatedAt: string
}

export interface SourcingSource {
  id: string
  name: string
  country: string
  enabled: boolean
}

export interface SourcingContact {
  id: string
  fullName: string
  role: string
  email: string | null
  linkedinUrl: string | null
  source: string
  status: string
  company: {
    id: string
    name: string
    country: string
  } | null
}

export interface SourcingRunDetail extends SourcingRun {
  contacts: SourcingContact[]
}

interface RunsResponse {
  data: SourcingRun[]
}

interface RunDetailResponse {
  data: SourcingRunDetail
}

interface SourcesResponse {
  data: SourcingSource[]
}

interface RunSourcingResponse {
  data: SourcingRun
  message: string
}

export function useSourcing() {
  const { token } = useAuth()
  const [runs, setRuns] = useState<SourcingRun[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRuns = useCallback(async () => {
    if (!token) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const res = await apiClient.get<RunsResponse>('/api/sourcing/runs', { token })
      setRuns(res.data)
    } catch {
      setError('Erreur lors du chargement des runs')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    void fetchRuns()
  }, [fetchRuns])

  const launchRun = useCallback(
    async (country: string, sector?: string, sources?: string[]) => {
      if (!token) throw new Error('Not authenticated')
      const res = await apiClient.post<RunSourcingResponse>('/api/sourcing/run', {
        country,
        sector: sector || undefined,
        sources: sources?.length ? sources : undefined,
      }, { token })
      setRuns((prev) => [res.data, ...prev])
      return res
    },
    [token],
  )

  const getRunDetail = useCallback(
    async (runId: string) => {
      if (!token) throw new Error('Not authenticated')
      const res = await apiClient.get<RunDetailResponse>(`/api/sourcing/runs/${runId}`, { token })
      return res.data
    },
    [token],
  )

  const getSources = useCallback(
    async (country: string) => {
      if (!token) throw new Error('Not authenticated')
      const res = await apiClient.get<SourcesResponse>(
        `/api/sourcing/sources?country=${encodeURIComponent(country)}`,
        { token },
      )
      return res.data
    },
    [token],
  )

  return {
    runs,
    isLoading,
    error,
    launchRun,
    getRunDetail,
    getSources,
    refetch: fetchRuns,
  }
}
