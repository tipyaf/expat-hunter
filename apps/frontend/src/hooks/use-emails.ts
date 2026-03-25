'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useCallback, useEffect, useState } from 'react'

export interface EmailContact {
  id: string
  fullName: string
  role: string
  email: string | null
  company: { id: string; name: string } | null
}

export interface Email {
  id: string
  contactId: string
  subject: string
  body: string
  type: string
  status: string
  sentAt: string | null
  scheduledAt: string | null
  contact: EmailContact | null
  createdAt: string
  updatedAt: string
}

export interface GenerationResult {
  generated: number
  errors: number
  skipped: number
  emailIds: string[]
}

interface EmailsResponse {
  data: Email[]
  meta: { total: number; perPage: number; currentPage: number; lastPage: number }
}

interface EmailResponse {
  data: Email
}

interface GenerateResponse {
  data: GenerationResult
}

export const EMAIL_STATUSES = ['draft', 'approved', 'sent', 'opened', 'replied', 'bounced'] as const
export type EmailStatus = (typeof EMAIL_STATUSES)[number]

export function useEmails(filters?: { status?: string; contactId?: string }) {
  const { token } = useAuth()
  const [emails, setEmails] = useState<Email[]>([])
  const [meta, setMeta] = useState<EmailsResponse['meta'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)

  const fetchEmails = useCallback(async (pageNum = 1) => {
    if (!token) { setIsLoading(false); return }
    try {
      setIsLoading(true)
      const params = new URLSearchParams({ page: String(pageNum), limit: '20' })
      if (filters?.status) params.set('status', filters.status)
      if (filters?.contactId) params.set('contact_id', filters.contactId)
      const res = await apiClient.get<EmailsResponse>(`/api/emails?${params.toString()}`, { token })
      setEmails(res.data)
      setMeta(res.meta)
      setPage(pageNum)
    } catch {
      // Error handled silently
    } finally {
      setIsLoading(false)
    }
  }, [token, filters?.status, filters?.contactId])

  useEffect(() => { void fetchEmails(1) }, [fetchEmails])

  const approve = useCallback(async (emailId: string) => {
    if (!token) return
    const res = await apiClient.post<EmailResponse>(`/api/emails/${emailId}/approve`, {}, { token })
    setEmails((prev) => prev.map((e) => (e.id === emailId ? res.data : e)))
    return res.data
  }, [token])

  const reject = useCallback(async (emailId: string) => {
    if (!token) return
    await apiClient.post(`/api/emails/${emailId}/reject`, {}, { token })
    setEmails((prev) => prev.filter((e) => e.id !== emailId))
  }, [token])

  const updateEmail = useCallback(async (emailId: string, data: { subject?: string; body?: string }) => {
    if (!token) return
    const res = await apiClient.put<EmailResponse>(`/api/emails/${emailId}`, data, { token })
    setEmails((prev) => prev.map((e) => (e.id === emailId ? res.data : e)))
    return res.data
  }, [token])

  const regenerate = useCallback(async (emailId: string) => {
    if (!token) return
    const res = await apiClient.post<EmailResponse>(`/api/emails/${emailId}/regenerate`, {}, { token })
    setEmails((prev) => prev.map((e) => (e.id === emailId ? res.data : e)))
    return res.data
  }, [token])

  const approveBatch = useCallback(async (emailIds: string[]) => {
    if (!token) return
    await apiClient.post(`/api/emails/approve-batch`, { emailIds }, { token })
    setEmails((prev) => prev.map((e) => emailIds.includes(e.id) ? { ...e, status: 'approved' } : e))
  }, [token])

  const sendBatch = useCallback(async (emailIds?: string[]) => {
    if (!token) throw new Error('Not authenticated')
    const res = await apiClient.post<{ data: { batchId: string; total: number } }>(
      '/api/emails/send-batch',
      emailIds ? { emailIds } : {},
      { token }
    )
    return res.data
  }, [token])

  const getSendBatchProgress = useCallback(async (batchId: string) => {
    if (!token) return null
    try {
      const res = await apiClient.get<{ data: {
        batchId: string
        status: 'running' | 'completed' | 'failed'
        total: number
        sent: number
        failed: number
        completedAt: string | null
      } }>(`/api/emails/send-batch/${batchId}/progress`, { token })
      return res.data
    } catch {
      return null
    }
  }, [token])

  return {
    emails, meta, page, isLoading,
    approve, reject, updateEmail, regenerate, approveBatch, sendBatch, getSendBatchProgress,
    goToPage: fetchEmails,
    refetch: () => fetchEmails(page),
  }
}

export function useEmailGeneration() {
  const { token } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastResult, setLastResult] = useState<GenerationResult | null>(null)

  const generate = useCallback(async (options?: { contactIds?: string[]; batchSize?: number }) => {
    if (!token) throw new Error('Not authenticated')
    setIsGenerating(true)
    try {
      const res = await apiClient.post<GenerateResponse>('/api/emails/generate', {
        contactIds: options?.contactIds,
        batchSize: options?.batchSize,
      }, { token })
      setLastResult(res.data)
      return res.data
    } finally {
      setIsGenerating(false)
    }
  }, [token])

  return { isGenerating, lastResult, generate }
}
