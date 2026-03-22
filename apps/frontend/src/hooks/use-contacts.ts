'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useCallback, useEffect, useState } from 'react'

export interface Contact {
  id: string
  userId: string
  companyId: string
  sourcingRunId: string | null
  fullName: string
  role: string
  email: string | null
  linkedinUrl: string | null
  source: string
  status: string
  relevanceScore: number | null
  relevanceLabel: string | null
  relevanceReason: string | null
  aiRecommendation: string | null
  userOverride: boolean
  confidenceScore: number | null
  confidenceFactors: Array<{ label: string; impact: 'positive' | 'negative' | 'neutral'; weight: number }> | null
  company: {
    id: string
    name: string
    sector: string | null
    country: string
    city: string | null
  } | null
  createdAt: string
  updatedAt: string
}

interface ContactsResponse {
  data: Contact[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

interface ContactResponse {
  data: Contact
}

export const CONTACT_STATUSES = [
  'identified', 'analyzed', 'to_contact', 'contacted',
  'replied', 'interview', 'offer', 'rejected',
] as const

export type ContactStatus = (typeof CONTACT_STATUSES)[number]

export function useContacts(filters?: { status?: string; sourcingRunId?: string }) {
  const { token } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [meta, setMeta] = useState<ContactsResponse['meta'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const fetchContacts = useCallback(async (pageNum = 1) => {
    if (!token) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const params = new URLSearchParams({ page: String(pageNum), limit: '20' })
      if (filters?.status) params.set('status', filters.status)
      if (filters?.sourcingRunId) params.set('sourcing_run_id', filters.sourcingRunId)

      const res = await apiClient.get<ContactsResponse>(
        `/api/contacts?${params.toString()}`,
        { token },
      )
      setContacts(res.data)
      setMeta(res.meta)
      setPage(pageNum)
    } catch {
      setError('Erreur lors du chargement des contacts')
    } finally {
      setIsLoading(false)
    }
  }, [token, filters?.status, filters?.sourcingRunId])

  useEffect(() => {
    void fetchContacts(1)
  }, [fetchContacts])

  const updateStatus = useCallback(
    async (contactId: string, status: ContactStatus) => {
      if (!token) throw new Error('Not authenticated')
      const res = await apiClient.patch<ContactResponse>(
        `/api/contacts/${contactId}/status`,
        { status },
        { token },
      )
      setContacts((prev) => prev.map((c) => (c.id === contactId ? res.data : c)))
      return res.data
    },
    [token],
  )

  return {
    contacts,
    meta,
    page,
    isLoading,
    error,
    updateStatus,
    goToPage: fetchContacts,
    refetch: () => fetchContacts(page),
  }
}
