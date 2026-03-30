'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useCallback, useEffect, useState } from 'react'

export type PresetLength = 'short' | 'medium' | 'long'
export type PresetFramework = 'aida' | 'pas' | 'bab' | 'direct'

export interface GenerationPreset {
  id: string
  name: string
  length: PresetLength
  framework: PresetFramework
  tone: string
  language: string
  customInstructions: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

interface PresetsResponse { data: GenerationPreset[] }

export function usePresets() {
  const { token } = useAuth()
  const [presets, setPresets] = useState<GenerationPreset[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!token) { setIsLoading(false); return }
    try {
      setIsLoading(true)
      const res = await apiClient.get<PresetsResponse>('/api/presets', { token })
      setPresets(res.data)
    } catch (error) {
      console.error('Failed to fetch presets:', error)
    } finally { setIsLoading(false) }
  }, [token])

  const create = async (data: Omit<GenerationPreset, 'id' | 'createdAt' | 'updatedAt'>) => {
    const res = await apiClient.post<{ data: GenerationPreset }>('/api/presets', data, { token: token! })
    setPresets((prev) => [res.data, ...prev])
    return res.data
  }

  const update = async (id: string, data: Partial<Omit<GenerationPreset, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const res = await apiClient.put<{ data: GenerationPreset }>(`/api/presets/${id}`, data, { token: token! })
    setPresets((prev) => prev.map((p) => p.id === id ? res.data : p))
    return res.data
  }

  const remove = async (id: string) => {
    await apiClient.delete(`/api/presets/${id}`, { token: token! })
    setPresets((prev) => prev.filter((p) => p.id !== id))
  }

  useEffect(() => { void fetch() }, [fetch])

  return { presets, isLoading, refetch: fetch, create, update, remove }
}
