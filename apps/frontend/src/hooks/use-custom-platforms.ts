'use client'

import { useAuth } from '@/contexts/auth-context'
import { customPlatformApi } from '@/lib/custom-platform-api'
import type { CustomPlatform, CreateCustomPlatformPayload, PlatformSuggestion } from '@/lib/custom-platform-api'
import { useCallback, useEffect, useState } from 'react'

export type { CustomPlatform, PlatformSuggestion }

export function useCustomPlatforms() {
  const { token } = useAuth()
  const [platforms, setPlatforms] = useState<CustomPlatform[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!token) { setIsLoading(false); return }
    try {
      setIsLoading(true)
      const res = await customPlatformApi.list(token)
      setPlatforms(res.data)
    } catch (error) {
      console.error('Failed to fetch custom platforms:', error)
    } finally { setIsLoading(false) }
  }, [token])

  const create = async (data: CreateCustomPlatformPayload): Promise<CustomPlatform> => {
    const res = await customPlatformApi.create(token!, data)
    setPlatforms((prev) => [res.data, ...prev])
    return res.data
  }

  const remove = async (id: string): Promise<void> => {
    await customPlatformApi.remove(token!, id)
    setPlatforms((prev) => prev.filter((p) => p.id !== id))
  }

  const getSuggestions = async (country: string): Promise<PlatformSuggestion[]> => {
    if (!token) return []
    const res = await customPlatformApi.suggestions(token, country)
    return res.data
  }

  useEffect(() => { void fetch() }, [fetch])

  return { platforms, isLoading, refetch: fetch, create, remove, getSuggestions }
}
