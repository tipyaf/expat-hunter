'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useCallback, useEffect, useState } from 'react'

export interface EmailConnection {
  id: string
  userId: string
  imapHost: string
  imapPort: number
  imapUser: string
  imapPassword: string
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  isActive: boolean
  lastSyncedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface EmailConnectionPayload {
  imapHost: string
  imapPort: number
  imapUser: string
  imapPassword: string
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  isActive?: boolean
}

interface UseEmailConnectionReturn {
  connection: EmailConnection | null
  isLoading: boolean
  isSaving: boolean
  isTesting: boolean
  save: (payload: EmailConnectionPayload) => Promise<void>
  remove: () => Promise<void>
  testConnection: () => Promise<{ success: boolean; message: string }>
  refresh: () => void
}

export function useEmailConnection(): UseEmailConnectionReturn {
  const { token } = useAuth()
  const [connection, setConnection] = useState<EmailConnection | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const fetch = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const res = await apiClient.get<{ data: EmailConnection | null }>(
        '/api/email-connections',
        { token }
      )
      setConnection(res.data)
    } catch {
      setConnection(null)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    void fetch()
  }, [fetch])

  const save = useCallback(
    async (payload: EmailConnectionPayload): Promise<void> => {
      if (!token) return
      setIsSaving(true)
      try {
        const res = await apiClient.post<{ data: EmailConnection }>(
          '/api/email-connections',
          payload,
          { token }
        )
        setConnection(res.data)
      } finally {
        setIsSaving(false)
      }
    },
    [token]
  )

  const remove = useCallback(async (): Promise<void> => {
    if (!token) return
    await apiClient.delete('/api/email-connections', { token })
    setConnection(null)
  }, [token])

  const testConnection = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (!token) return { success: false, message: 'Not authenticated' }
    setIsTesting(true)
    try {
      const res = await apiClient.post<{ data: { success: boolean; message: string } }>(
        '/api/email-connections/test',
        {},
        { token }
      )
      return res.data
    } catch {
      return { success: false, message: 'Connection test failed' }
    } finally {
      setIsTesting(false)
    }
  }, [token])

  return {
    connection,
    isLoading,
    isSaving,
    isTesting,
    save,
    remove,
    testConnection,
    refresh: () => { void fetch() },
  }
}
