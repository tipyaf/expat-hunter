'use client'

import { useState, useCallback, useEffect } from 'react'
import { jobCvApi } from '@/lib/job-cv-api'
import type { CvReplacement, CvApplicationResponse } from '@/lib/job-cv-api'

interface UseJobCvResult {
  application: CvApplicationResponse | null
  cvText: string | null
  cvReplacements: CvReplacement[]
  isLoading: boolean
  isGenerating: boolean
  isRefining: boolean
  isSaving: boolean
  isDownloading: boolean
  error: string | null
  quotaExceeded: boolean
  noCv: boolean
  generateCv: () => Promise<void>
  refineCv: (instruction: string) => Promise<void>
  saveCv: (text: string) => Promise<void>
  downloadPdf: () => Promise<void>
  clearError: () => void
}

export function useJobCv(offerId: string, token: string): UseJobCvResult {
  const [application, setApplication] = useState<CvApplicationResponse | null>(null)
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
        const res = await jobCvApi.getApplication(offerId, token)
        if (!cancelled) {
          setApplication(res.data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load CV data')
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

  const generateCv = useCallback(async (): Promise<void> => {
    if (isGenerating || quotaExceeded) return
    setIsGenerating(true)
    setError(null)
    setNoCv(false)
    try {
      const res = await jobCvApi.generate(offerId, token)
      setApplication(res.data)
    } catch (err) {
      handleApiError(err)
    } finally {
      setIsGenerating(false)
    }
  }, [offerId, token, isGenerating, quotaExceeded, handleApiError])

  const refineCv = useCallback(async (instruction: string): Promise<void> => {
    if (isRefining) return
    setIsRefining(true)
    setError(null)
    try {
      const res = await jobCvApi.refine(offerId, instruction, token)
      setApplication(res.data)
    } catch (err) {
      handleApiError(err)
    } finally {
      setIsRefining(false)
    }
  }, [offerId, token, isRefining, handleApiError])

  const saveCv = useCallback(async (text: string): Promise<void> => {
    if (isSaving) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await jobCvApi.saveCvText(offerId, text, token)
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
      const blob = await jobCvApi.downloadPdf(offerId, token)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'cv-expathunter.pdf'
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
    cvText: application?.cvText ?? null,
    cvReplacements: application?.cvReplacements ?? [],
    isLoading,
    isGenerating,
    isRefining,
    isSaving,
    isDownloading,
    error,
    quotaExceeded,
    noCv,
    generateCv,
    refineCv,
    saveCv,
    downloadPdf,
    clearError,
  }
}
