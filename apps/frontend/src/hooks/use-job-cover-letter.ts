'use client'

import { useState, useCallback, useEffect } from 'react'
import { jobCoverLetterApi } from '@/lib/job-cover-letter-api'
import type { CoverLetterApplicationResponse } from '@/lib/job-cover-letter-api'

interface UseJobCoverLetterResult {
  application: CoverLetterApplicationResponse | null
  coverLetterText: string | null
  isLoading: boolean
  isGenerating: boolean
  isRefining: boolean
  isSaving: boolean
  isDownloading: boolean
  error: string | null
  quotaExceeded: boolean
  noCv: boolean
  generateCoverLetter: () => Promise<void>
  refineCoverLetter: (instruction: string) => Promise<void>
  saveCoverLetter: (text: string) => Promise<void>
  downloadPdf: () => Promise<void>
  clearError: () => void
}

export function useJobCoverLetter(offerId: string, token: string): UseJobCoverLetterResult {
  const [application, setApplication] = useState<CoverLetterApplicationResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quotaExceeded, setQuotaExceeded] = useState(false)
  const [noCv, setNoCv] = useState(false)

  useEffect(() => {
    if (!token || !offerId) return
    let cancelled = false

    async function fetchApplication(): Promise<void> {
      setIsLoading(true)
      setError(null)
      try {
        const res = await jobCoverLetterApi.getApplication(offerId, token)
        if (!cancelled) {
          setApplication(res.data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load cover letter data')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void fetchApplication()
    return (): void => { cancelled = true }
  }, [offerId, token])

  const handleApiError = useCallback((err: unknown): void => {
    if (err instanceof Error && 'status' in err) {
      const status = (err as Error & { status: number }).status
      if (status === 403) {
        setQuotaExceeded(true)
        setError('quota_exceeded')
        return
      }
      if (status === 400) {
        setNoCv(true)
        setError('no_cv')
        return
      }
    }
    setError(err instanceof Error ? err.message : 'An error occurred')
  }, [])

  const generateCoverLetter = useCallback(async (): Promise<void> => {
    if (isGenerating || quotaExceeded) return
    setIsGenerating(true)
    setError(null)
    setNoCv(false)
    try {
      const res = await jobCoverLetterApi.generate(offerId, token)
      setApplication(res.data)
    } catch (err) {
      handleApiError(err)
    } finally {
      setIsGenerating(false)
    }
  }, [offerId, token, isGenerating, quotaExceeded, handleApiError])

  const refineCoverLetter = useCallback(async (instruction: string): Promise<void> => {
    if (isRefining) return
    setIsRefining(true)
    setError(null)
    try {
      const res = await jobCoverLetterApi.refine(offerId, instruction, token)
      setApplication(res.data)
    } catch (err) {
      handleApiError(err)
    } finally {
      setIsRefining(false)
    }
  }, [offerId, token, isRefining, handleApiError])

  const saveCoverLetter = useCallback(async (text: string): Promise<void> => {
    if (isSaving) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await jobCoverLetterApi.saveCoverLetterText(offerId, text, token)
      setApplication(res.data)
    } catch (err) {
      handleApiError(err)
    } finally {
      setIsSaving(false)
    }
  }, [offerId, token, isSaving, handleApiError])

  const downloadPdf = useCallback(async (): Promise<void> => {
    if (isDownloading) return
    setIsDownloading(true)
    setError(null)
    try {
      const blob = await jobCoverLetterApi.downloadPdf(offerId, token)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'cover-letter-expathunter.pdf'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF download failed')
    } finally {
      setIsDownloading(false)
    }
  }, [offerId, token, isDownloading])

  const clearError = useCallback((): void => {
    setError(null)
    setQuotaExceeded(false)
    setNoCv(false)
  }, [])

  return {
    application,
    coverLetterText: application?.coverLetterText ?? null,
    isLoading,
    isGenerating,
    isRefining,
    isSaving,
    isDownloading,
    error,
    quotaExceeded,
    noCv,
    generateCoverLetter,
    refineCoverLetter,
    saveCoverLetter,
    downloadPdf,
    clearError,
  }
}
