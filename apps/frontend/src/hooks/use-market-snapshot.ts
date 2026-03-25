'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useCallback, useEffect, useState } from 'react'

export interface MarketSnapshot {
  country: string
  sector: string | null
  trend: string
  bestPeriod: string
  estimatedOffers: number
  averageSalary: string | null
  insights: string[]
  fetchedAt: string
}

interface SnapshotResponse {
  data: MarketSnapshot
}

export function useMarketSnapshot(country: string | null, sector?: string | null) {
  const { token } = useAuth()
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSnapshot = useCallback(async () => {
    if (!token || !country) {
      setSnapshot(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const params = new URLSearchParams({ country })
      if (sector) params.set('sector', sector)

      const res = await apiClient.get<SnapshotResponse>(
        `/api/market/snapshot?${params.toString()}`,
        { token },
      )
      setSnapshot(res.data)
    } catch {
      setError('Erreur lors du chargement du snapshot marché')
    } finally {
      setIsLoading(false)
    }
  }, [token, country, sector])

  useEffect(() => {
    void fetchSnapshot()
  }, [fetchSnapshot])

  return {
    snapshot,
    isLoading,
    error,
    refetch: fetchSnapshot,
  }
}
