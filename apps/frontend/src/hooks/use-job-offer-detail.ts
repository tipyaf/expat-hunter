'use client'

import { useState, useEffect, useCallback } from 'react'
import { jobOffersApi } from '@/lib/job-offers-api'
import type { JobOfferResponse, JobOfferStatus, ExclusionCategory } from '@/lib/job-offers-api'

interface UseJobOfferDetailResult {
  offer: JobOfferResponse | null
  hasCrossContact: boolean
  isLoading: boolean
  error: string | null
  updateStatus: (status: JobOfferStatus) => Promise<void>
  updateAdvice: (advice: string) => Promise<void>
  excludeOffer: (category: ExclusionCategory, reason: string) => Promise<void>
  refetch: () => void
}

export function useJobOfferDetail(offerId: string, token: string): UseJobOfferDetailResult {
  const [offer, setOffer] = useState<JobOfferResponse | null>(null)
  const [hasCrossContact, setHasCrossContact] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchDetail = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const [detailRes, crossRes] = await Promise.all([
        jobOffersApi.getDetail(offerId, token),
        jobOffersApi.getCrossContacts(offerId, token),
      ])
      setOffer(detailRes.data)
      setHasCrossContact(crossRes.data.hasCrossContact)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load offer'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [offerId, token, refreshKey])

  useEffect(() => {
    if (!token) return
    void fetchDetail()
  }, [fetchDetail, token])

  const updateStatus = useCallback(async (status: JobOfferStatus): Promise<void> => {
    if (!offer) return
    const previousStatus = offer.status
    // Optimistic update
    setOffer((prev) => prev ? { ...prev, status } : prev)
    try {
      const result = await jobOffersApi.updateStatus(offerId, status, token)
      setOffer(result.data)
    } catch {
      // Revert on error
      setOffer((prev) => prev ? { ...prev, status: previousStatus } : prev)
    }
  }, [offer, offerId, token])

  const updateAdvice = useCallback(async (advice: string): Promise<void> => {
    const result = await jobOffersApi.updateAdvice(offerId, advice, token)
    setOffer(result.data)
  }, [offerId, token])

  const excludeOffer = useCallback(async (category: ExclusionCategory, reason: string): Promise<void> => {
    const result = await jobOffersApi.exclude(offerId, { category, reason }, token)
    setOffer(result.data)
  }, [offerId, token])

  const refetch = useCallback((): void => {
    setRefreshKey((k) => k + 1)
  }, [])

  return {
    offer,
    hasCrossContact,
    isLoading,
    error,
    updateStatus,
    updateAdvice,
    excludeOffer,
    refetch,
  }
}
