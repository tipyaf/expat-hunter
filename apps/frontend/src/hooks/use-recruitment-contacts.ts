'use client'

import { useState, useCallback, useEffect } from 'react'
import { jobRecruitmentContactsApi } from '@/lib/job-recruitment-contacts-api'
import type {
  RecruitmentContact,
  CreateRecruitmentContactPayload,
  UpdateRecruitmentContactPayload,
} from '@/lib/job-recruitment-contacts-api'

interface UseRecruitmentContactsResult {
  contacts: RecruitmentContact[]
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  isRemoving: boolean
  error: string | null
  addContact: (payload: CreateRecruitmentContactPayload) => Promise<void>
  updateContact: (contactId: string, payload: UpdateRecruitmentContactPayload) => Promise<void>
  removeContact: (contactId: string) => Promise<void>
  clearError: () => void
}

export function useRecruitmentContacts(offerId: string, token: string): UseRecruitmentContactsResult {
  const [contacts, setContacts] = useState<RecruitmentContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !offerId) return
    let cancelled = false

    async function fetchContacts(): Promise<void> {
      setIsLoading(true)
      setError(null)
      try {
        const res = await jobRecruitmentContactsApi.list(offerId, token)
        if (!cancelled) setContacts(res.data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load contacts')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void fetchContacts()
    return (): void => { cancelled = true }
  }, [offerId, token])

  const addContact = useCallback(async (payload: CreateRecruitmentContactPayload): Promise<void> => {
    if (isCreating) return
    setIsCreating(true)
    setError(null)
    try {
      const res = await jobRecruitmentContactsApi.create(offerId, payload, token)
      setContacts((prev) => [...prev, res.data])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contact')
    } finally {
      setIsCreating(false)
    }
  }, [offerId, token, isCreating])

  const updateContact = useCallback(async (contactId: string, payload: UpdateRecruitmentContactPayload): Promise<void> => {
    if (isUpdating) return
    setIsUpdating(true)
    setError(null)
    try {
      const res = await jobRecruitmentContactsApi.update(offerId, contactId, payload, token)
      setContacts((prev) => prev.map((c) => c.id === contactId ? res.data : c))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contact')
    } finally {
      setIsUpdating(false)
    }
  }, [offerId, token, isUpdating])

  const removeContact = useCallback(async (contactId: string): Promise<void> => {
    if (isRemoving) return
    setIsRemoving(true)
    setError(null)
    try {
      await jobRecruitmentContactsApi.remove(offerId, contactId, token)
      setContacts((prev) => prev.filter((c) => c.id !== contactId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove contact')
    } finally {
      setIsRemoving(false)
    }
  }, [offerId, token, isRemoving])

  const clearError = useCallback((): void => { setError(null) }, [])

  return {
    contacts,
    isLoading,
    isCreating,
    isUpdating,
    isRemoving,
    error,
    addContact,
    updateContact,
    removeContact,
    clearError,
  }
}
