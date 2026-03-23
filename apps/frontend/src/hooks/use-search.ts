'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface SearchRun {
  id: string
  country: string
  sector: string | null
  status: 'pending' | 'scraping' | 'enriching' | 'analyzing' | 'generating' | 'completed' | 'failed'
  progressPercent: number
  currentStep: string | null
  contactsFound: number
  contactsRelevant: number
  emailsGenerated: number
  contactsExcludedCooldown: number
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export interface SearchDefaults {
  country: string | null
  sector: string | null
}

interface SearchResult {
  searchRunId: string
  contactsFound: number
  contactsRelevant: number
  emailsGenerated: number
  contactsExcludedCooldown: number
}

interface LaunchResponse {
  data: SearchResult
  message: string
}

interface RunsResponse {
  data: SearchRun[]
}

interface ProgressResponse {
  data: SearchRun
}

interface DefaultsResponse {
  data: SearchDefaults
}

export function useSearch() {
  const { token } = useAuth()
  const [runs, setRuns] = useState<SearchRun[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [activeRun, setActiveRun] = useState<SearchRun | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchRuns = useCallback(async () => {
    if (!token) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const res = await apiClient.get<RunsResponse>('/api/recherche', { token })
      setRuns(res.data)
    } catch {
      setError('Erreur lors du chargement des recherches')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    void fetchRuns()
  }, [fetchRuns])

  const launchSearch = useCallback(
    async (country: string, sector?: string, sources?: string[]) => {
      if (!token) throw new Error('Not authenticated')
      const res = await apiClient.post<LaunchResponse>('/api/recherche', {
        country,
        sector: sector || undefined,
        sources: sources?.length ? sources : undefined,
      }, { token })

      setActiveRunId(res.data.searchRunId)
      void fetchRuns()
      return res
    },
    [token, fetchRuns],
  )

  const pollProgress = useCallback(
    async (searchRunId: string) => {
      if (!token) return null
      const res = await apiClient.get<ProgressResponse>(
        `/api/recherche/${searchRunId}/progress`,
        { token },
      )
      setActiveRun(res.data)
      return res.data
    },
    [token],
  )

  // Auto-poll active run
  useEffect(() => {
    if (!activeRunId || !token) return

    const poll = async () => {
      const run = await pollProgress(activeRunId)
      if (run && (run.status === 'completed' || run.status === 'failed')) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
        void fetchRuns()
      }
    }

    void poll()
    pollingRef.current = setInterval(() => void poll(), 2000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [activeRunId, token, pollProgress, fetchRuns])

  const getDefaults = useCallback(async () => {
    if (!token) return { country: null, sector: null }
    const res = await apiClient.get<DefaultsResponse>('/api/recherche/defaults', { token })
    return res.data
  }, [token])

  return {
    runs,
    isLoading,
    error,
    activeRun,
    activeRunId,
    launchSearch,
    getDefaults,
    refetch: fetchRuns,
  }
}
