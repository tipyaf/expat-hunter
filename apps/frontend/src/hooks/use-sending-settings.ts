'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useCallback, useEffect, useState } from 'react'

export interface AdminEmailLimits {
  maxFollowUps: number
  minFollowUpDelay: number
  minFollowUpDelayUnit: 'days' | 'weeks' | 'months'
}

export interface SendingSettings {
  followUps: Array<{ delayDays: number }>
  limits: AdminEmailLimits
}

interface SendingSettingsResponse { data: SendingSettings }

const DEFAULT: SendingSettings = {
  followUps: [{ delayDays: 7 }, { delayDays: 14 }, { delayDays: 21 }],
  limits: { maxFollowUps: 3, minFollowUpDelay: 1, minFollowUpDelayUnit: 'days' },
}

export function useSendingSettings() {
  const { token } = useAuth()
  const [settings, setSettings] = useState<SendingSettings>(DEFAULT)
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!token) { setIsLoading(false); return }
    try {
      const res = await apiClient.get<SendingSettingsResponse>('/api/sending-settings', { token })
      setSettings(res.data)
    } catch {
      // Use defaults
    } finally {
      setIsLoading(false)
    }
  }, [token])

  const updateAdminLimits = async (data: Partial<AdminEmailLimits>) => {
    if (!token) return
    const res = await apiClient.patch<{ data: AdminEmailLimits }>('/api/admin/settings/emails', data, { token })
    setSettings((prev) => ({ ...prev, limits: res.data }))
    return res.data
  }

  useEffect(() => { void fetch() }, [fetch])

  return { settings, isLoading, refetch: fetch, updateAdminLimits }
}
