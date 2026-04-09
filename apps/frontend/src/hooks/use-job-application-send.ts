'use client'

import { useState, useCallback, useEffect } from 'react'
import { jobApplicationSendApi } from '@/lib/job-application-send-api'
import type { ApplicationEmailStatus } from '@/lib/job-application-send-api'

interface UseJobApplicationSendResult {
  emailStatus: ApplicationEmailStatus | null
  isLoading: boolean
  isGenerating: boolean
  isSending: boolean
  error: string | null
  quotaExceeded: boolean
  noCv: boolean
  noCoverLetter: boolean
  generateEmail: () => Promise<void>
  sendApplication: (recipientEmail: string) => Promise<void>
  clearError: () => void
  refetch: () => void
}

export function useJobApplicationSend(offerId: string, token: string): UseJobApplicationSendResult {
  const [emailStatus, setEmailStatus] = useState<ApplicationEmailStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quotaExceeded, setQuotaExceeded] = useState(false)
  const [noCv, setNoCv] = useState(false)
  const [noCoverLetter, setNoCoverLetter] = useState(false)
  const [fetchCount, setFetchCount] = useState(0)

  useEffect(() => {
    if (!token || !offerId) return
    let cancelled = false

    async function fetchStatus(): Promise<void> {
      setIsLoading(true)
      setError(null)
      try {
        const res = await jobApplicationSendApi.getStatus(offerId, token)
        if (!cancelled) setEmailStatus(res.data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load email status')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void fetchStatus()
    return (): void => { cancelled = true }
  }, [offerId, token, fetchCount])

  const handleApiError = useCallback((err: unknown): void => {
    if (err instanceof Error && 'status' in err) {
      const status = (err as Error & { status: number }).status
      if (status === 403) { setQuotaExceeded(true); return }
      if (status === 400) {
        const msg = err.message.toLowerCase()
        if (msg.includes('cv')) { setNoCv(true); return }
        if (msg.includes('cover letter')) { setNoCoverLetter(true); return }
      }
    }
    setError(err instanceof Error ? err.message : 'An error occurred')
  }, [])

  const generateEmail = useCallback(async (): Promise<void> => {
    if (isGenerating || quotaExceeded) return
    setIsGenerating(true)
    setError(null)
    setNoCv(false)
    setNoCoverLetter(false)
    try {
      const res = await jobApplicationSendApi.generateEmail(offerId, token)
      setEmailStatus((prev) => prev ? { ...prev, hasEmail: true, emailText: res.data.emailText } : prev)
    } catch (err) {
      handleApiError(err)
    } finally {
      setIsGenerating(false)
    }
  }, [offerId, token, isGenerating, quotaExceeded, handleApiError])

  const sendApplication = useCallback(async (recipientEmail: string): Promise<void> => {
    if (isSending) return
    setIsSending(true)
    setError(null)
    try {
      const res = await jobApplicationSendApi.sendApplication(offerId, recipientEmail, token)
      setEmailStatus((prev) => prev ? {
        ...prev,
        status: res.data.status as ApplicationEmailStatus['status'],
        sentAt: res.data.sentAt,
        sentToEmail: res.data.sentToEmail,
      } : prev)
    } catch (err) {
      handleApiError(err)
    } finally {
      setIsSending(false)
    }
  }, [offerId, token, isSending, handleApiError])

  const clearError = useCallback((): void => {
    setError(null)
    setQuotaExceeded(false)
    setNoCv(false)
    setNoCoverLetter(false)
  }, [])

  const refetch = useCallback((): void => {
    setFetchCount((c) => c + 1)
  }, [])

  return {
    emailStatus,
    isLoading,
    isGenerating,
    isSending,
    error,
    quotaExceeded,
    noCv,
    noCoverLetter,
    generateEmail,
    sendApplication,
    clearError,
    refetch,
  }
}
