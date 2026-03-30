'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'

export interface AnalysisResult {
  analyzed: number
  errors: number
  skipped: number
  contactIds: string[]
}

export interface AnalysisStats {
  total: number
  analyzed: number
  pending: number
  byLabel: Record<string, number>
  byRecommendation: Record<string, number>
}

interface AnalysisRunResponse {
  data: AnalysisResult
}

interface AnalysisStatsResponse {
  data: AnalysisStats
}

export function useAnalysis() {
  const { token } = useAuth()
  const tErrors = useTranslations('errors')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null)
  const [stats, setStats] = useState<AnalysisStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = useCallback(
    async (options?: { sourcingRunId?: string; batchSize?: number }) => {
      if (!token) throw new Error('Not authenticated')
      setIsAnalyzing(true)
      setError(null)
      try {
        const res = await apiClient.post<AnalysisRunResponse>(
          '/api/analysis/run',
          {
            sourcingRunId: options?.sourcingRunId,
            batchSize: options?.batchSize,
          },
          { token }
        )
        setLastResult(res.data)
        return res.data
      } catch (err) {
        const message = err instanceof Error ? err.message : tErrors('analysis')
        setError(message)
        throw err
      } finally {
        setIsAnalyzing(false)
      }
    },
    [token]
  )

  const analyzeOne = useCallback(
    async (contactId: string) => {
      if (!token) throw new Error('Not authenticated')
      const res = await apiClient.post<{ data: unknown }>(
        `/api/analysis/contact/${contactId}`,
        {},
        { token }
      )
      return res.data
    },
    [token]
  )

  const fetchStats = useCallback(async () => {
    if (!token) return
    try {
      const res = await apiClient.get<AnalysisStatsResponse>('/api/analysis/stats', { token })
      setStats(res.data)
    } catch (error) {
      console.error('Failed to fetch analysis stats:', error)
    }
  }, [token])

  return {
    isAnalyzing,
    lastResult,
    stats,
    error,
    runAnalysis,
    analyzeOne,
    fetchStats,
  }
}
