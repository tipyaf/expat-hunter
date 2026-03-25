'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useCallback, useEffect, useState } from 'react'

export interface EmailReply {
  id: string
  emailMessageId: string | null
  userId: string
  contactId: string
  fromEmail: string
  subject: string
  bodyText: string | null
  bodyHtml: string | null
  receivedAt: string
  isRead: boolean
  detectedEvent: 'interview' | 'rejection' | 'offer' | 'info_request' | 'other' | null
  aiSummary: string | null
  createdAt: string
  updatedAt: string
}

export interface EmailMessage {
  id: string
  contactId: string
  subject: string
  body: string
  type: string
  status: string
  sentAt: string | null
  createdAt: string
}

interface ThreadData {
  replies: EmailReply[]
  emails: EmailMessage[]
  summary: string | null
}

interface UseThreadReturn {
  replies: EmailReply[]
  emails: EmailMessage[]
  summary: string | null
  isLoading: boolean
  error: string | null
  refresh: () => void
  generateReply: (replyId: string) => Promise<string>
  sendReply: (subject: string, body: string) => Promise<void>
  syncReplies: () => Promise<{ synced: number }>
}

export function useThread(contactId: string): UseThreadReturn {
  const { token } = useAuth()
  const [data, setData] = useState<ThreadData>({ replies: [], emails: [], summary: null })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!token || !contactId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<{ data: ThreadData }>(
        `/api/contacts/${contactId}/thread`,
        { token }
      )
      setData(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load thread')
    } finally {
      setIsLoading(false)
    }
  }, [token, contactId])

  useEffect(() => {
    void fetch()
  }, [fetch])

  const generateReply = useCallback(
    async (replyId: string): Promise<string> => {
      if (!token) return ''
      const res = await apiClient.post<{ data: { suggestedReply: string } }>(
        `/api/contacts/${contactId}/reply/generate`,
        { replyId },
        { token }
      )
      return res.data.suggestedReply
    },
    [token, contactId]
  )

  const sendReply = useCallback(
    async (subject: string, body: string): Promise<void> => {
      if (!token) return
      await apiClient.post(
        `/api/contacts/${contactId}/reply`,
        { subject, body },
        { token }
      )
      await fetch()
    },
    [token, contactId, fetch]
  )

  const syncReplies = useCallback(async (): Promise<{ synced: number }> => {
    if (!token) return { synced: 0 }
    const res = await apiClient.post<{ data: { synced: number; errors: number } }>(
      `/api/contacts/${contactId}/sync`,
      {},
      { token }
    )
    await fetch()
    return { synced: res.data.synced }
  }, [token, contactId, fetch])

  return {
    replies: data.replies,
    emails: data.emails,
    summary: data.summary,
    isLoading,
    error,
    refresh: () => { void fetch() },
    generateReply,
    sendReply,
    syncReplies,
  }
}
