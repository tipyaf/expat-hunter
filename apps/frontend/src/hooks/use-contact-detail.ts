'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useCallback, useEffect, useState } from 'react'

export interface ContactDetail {
  id: string
  fullName: string
  role: string
  email: string | null
  linkedinUrl: string | null
  githubUrl: string | null
  source: string | null
  emailSource: string | null
  emailConfidence: number | null
  emailStatus: string | null
  status: string
  relevanceScore: number | null
  relevanceLabel: string | null
  relevanceReason: string | null
  aiRecommendation: string | null
  userOverride: boolean
  scoreBreakdown: Record<string, { score: number; maxScore: number; explanation: string }> | null
  company: {
    id: string
    name: string
    sector: string | null
    country: string
    city: string | null
    domain: string | null
    visaSponsorStatus: 'accredited' | 'not_found' | 'unknown' | null
    visaSponsorCountries: string[] | null
  } | null
  createdAt: string
  updatedAt: string
}

export interface EmailEntry {
  id: string
  subject: string
  body: string
  type: string
  status: string
  sentAt: string | null
  createdAt: string
}

export interface ReplyEntry {
  id: string
  fromEmail: string
  subject: string
  bodyText: string | null
  receivedAt: string
  isRead: boolean
  aiSummary: string | null
}

export interface ThreadData {
  emails: EmailEntry[]
  replies: ReplyEntry[]
  summary: string | null
}

interface ContactDetailResponse {
  data: ContactDetail
}

interface ThreadResponse {
  data: ThreadData
}

export function useContactDetail(contactId: string | null) {
  const { token } = useAuth()
  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [thread, setThread] = useState<ThreadData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDetail = useCallback(async (id: string) => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const [detailRes, threadRes] = await Promise.all([
        apiClient.get<ContactDetailResponse>(`/api/contacts/${id}`, { token }),
        apiClient.get<ThreadResponse>(`/api/contacts/${id}/thread`, { token }),
      ])
      setContact(detailRes.data)
      setThread(threadRes.data)
    } catch {
      setError('error')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (contactId) {
      void fetchDetail(contactId)
    } else {
      setContact(null)
      setThread(null)
      setError(null)
    }
  }, [contactId, fetchDetail])

  return { contact, thread, isLoading, error }
}
