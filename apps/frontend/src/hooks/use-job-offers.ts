'use client'

import { useAuth } from '@/contexts/auth-context'
import { jobOffersApi, TAB_STATUS_MAP, type JobOfferResponse, type JobOffersListResponse, type JobOfferStatus, type JobOfferTab } from '@/lib/job-offers-api'
import { useCallback, useEffect, useState } from 'react'

interface UseJobOffersParams {
  searchId?: string
  tab?: JobOfferTab
}

interface UseJobOffersReturn {
  offers: JobOfferResponse[]
  meta: JobOffersListResponse['meta'] | null
  page: number
  isLoading: boolean
  error: string | null
  activeTab: JobOfferTab
  setActiveTab: (tab: JobOfferTab) => void
  updateOfferStatus: (offerId: string, newStatus: JobOfferStatus) => Promise<void>
  goToPage: (page: number) => Promise<void>
  refetch: () => Promise<void>
}

export function useJobOffers(params: UseJobOffersParams = {}): UseJobOffersReturn {
  const { token } = useAuth()
  const [offers, setOffers] = useState<JobOfferResponse[]>([])
  const [meta, setMeta] = useState<JobOffersListResponse['meta'] | null>(null)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<JobOfferTab>(params.tab ?? 'new')

  const fetchOffers = useCallback(async (pageNum = 1) => {
    if (!token) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)

      // Fetch all offers — tab filtering is done client-side
      const res = await jobOffersApi.list({
        searchId: params.searchId,
        page: pageNum,
      }, token)

      setOffers(res.data)
      setMeta(res.meta)
      setPage(pageNum)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load offers'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [token, activeTab, params.searchId])

  useEffect(() => {
    void fetchOffers(1)
  }, [fetchOffers])

  const updateOfferStatus = useCallback(async (offerId: string, newStatus: JobOfferStatus) => {
    if (!token) return

    // Optimistic update
    const previousOffers = [...offers]
    setOffers((prev) =>
      prev.map((offer) =>
        offer.id === offerId ? { ...offer, status: newStatus } : offer
      )
    )

    try {
      await jobOffersApi.updateStatus(offerId, newStatus, token)
    } catch {
      // Revert on failure
      setOffers(previousOffers)
    }
  }, [token, offers])

  const goToPage = useCallback(async (pageNum: number) => {
    await fetchOffers(pageNum)
  }, [fetchOffers])

  const refetch = useCallback(async () => {
    await fetchOffers(page)
  }, [fetchOffers, page])

  return {
    offers,
    meta,
    page,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    updateOfferStatus,
    goToPage,
    refetch,
  }
}
