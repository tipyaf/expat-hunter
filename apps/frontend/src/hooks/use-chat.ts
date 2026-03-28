'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useCallback, useState } from 'react'

export type ChatMode = 'support' | 'expert' | 'mixed'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  mode?: ChatMode
  actions?: { label: string; type: string; payload?: Record<string, unknown> }[]
}

export interface ChatContext {
  page: string
  contactId?: string
  companyName?: string
  country?: string
}

export interface ChatQuota {
  used: number
  limit: number | null
  remaining: number | null
}

export function useChat() {
  const { token } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [quota, setQuota] = useState<ChatQuota | null>(null)
  const [sessionId] = useState(
    () => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  )

  const sendMessage = useCallback(
    async (content: string, context: ChatContext) => {
      if (!token || !content.trim()) return

      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content }
      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      try {
        const res = await apiClient.post<{
          data: { message: string; mode: ChatMode; actions?: { label: string; type: string; payload?: Record<string, unknown> }[] }
          quota?: ChatQuota
        }>(
          '/api/assistant/chat',
          {
            message: content,
            sessionId,
            page: context.page,
            contactId: context.contactId,
            companyName: context.companyName,
            country: context.country,
          },
          { token }
        )
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: res.data.message,
          mode: res.data.mode,
          actions: res.data.actions,
        }
        setMessages((prev) => [...prev, assistantMsg])
        if (res.quota) {
          setQuota(res.quota)
        }
      } catch (err) {
        const detail =
          err instanceof Error ? err.message : 'Unknown error'
        console.error('[useChat] sendMessage error:', err)
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Désolé, une erreur est survenue: ${detail}`,
          mode: 'support',
        }
        setMessages((prev) => [...prev, errorMsg])
      } finally {
        setIsLoading(false)
      }
    },
    [token, sessionId]
  )

  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, isLoading, sessionId, sendMessage, clearMessages, quota }
}
