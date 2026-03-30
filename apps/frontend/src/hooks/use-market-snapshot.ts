'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useLocale, useTranslations } from 'next-intl'
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
  const locale = useLocale()
  const tErrors = useTranslations('errors')
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSnapshot = useCallback(async () => {
    if (!token || !country) {
      setSnapshot(null)
      return
    }

    try {
      // Only show loading spinner on initial load (no existing snapshot)
      // On subsequent fetches, keep showing the old snapshot to avoid flashing
      if (!snapshot) setIsLoading(true)
      setError(null)
      const params = new URLSearchParams({ country, lang: locale })
      if (sector) params.set('sector', sector)

      const res = await apiClient.get<SnapshotResponse>(
        `/api/market/snapshot?${params.toString()}`,
        { token },
      )
      setSnapshot(res.data)
    } catch (error) {
      console.error('Failed to fetch market snapshot:', error)
      setError(tErrors('loadingMarketSnapshot'))
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, country, sector, locale])

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
