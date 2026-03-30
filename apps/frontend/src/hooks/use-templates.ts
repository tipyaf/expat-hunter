'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useCallback, useEffect, useState } from 'react'

export interface EmailTemplate {
  id: string
  name: string
  subjectPattern: string
  bodyPattern: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

interface TemplatesResponse { data: EmailTemplate[] }

export function useTemplates() {
  const { token } = useAuth()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!token) { setIsLoading(false); return }
    try {
      setIsLoading(true)
      const res = await apiClient.get<TemplatesResponse>('/api/templates', { token })
      setTemplates(res.data)
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally { setIsLoading(false) }
  }, [token])

  const create = async (data: Pick<EmailTemplate, 'name' | 'subjectPattern' | 'bodyPattern' | 'isDefault'>) => {
    const res = await apiClient.post<{ data: EmailTemplate }>('/api/templates', data, { token: token! })
    setTemplates((prev) => [res.data, ...prev])
    return res.data
  }

  const update = async (id: string, data: Partial<Pick<EmailTemplate, 'name' | 'subjectPattern' | 'bodyPattern' | 'isDefault'>>) => {
    const res = await apiClient.put<{ data: EmailTemplate }>(`/api/templates/${id}`, data, { token: token! })
    setTemplates((prev) => prev.map((t) => t.id === id ? res.data : t))
    return res.data
  }

  const remove = async (id: string) => {
    await apiClient.delete(`/api/templates/${id}`, { token: token! })
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  useEffect(() => { void fetch() }, [fetch])

  return { templates, isLoading, refetch: fetch, create, update, remove }
}
