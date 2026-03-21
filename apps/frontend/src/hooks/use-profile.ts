'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useCallback, useEffect, useState } from 'react'

export interface CandidateProfile {
  id: string
  userId: string
  cvText: string | null
  cvFilePath: string | null
  skills: string[]
  experienceYears: number
  targetCountries: string[]
  targetSectors: string[]
  targetRoles: string[]
  preferences: Record<string, unknown> | null
  onboardingCompleted: boolean
  createdAt: string
  updatedAt: string
}

export interface AiExtraction {
  skills: string[]
  suggestedRoles: string[]
  suggestedSectors: string[]
  experienceYears: number | null
  summary: string
}

interface ProfileResponse {
  data: CandidateProfile | null
  aiExtraction?: AiExtraction | null
  message?: string
}

export interface UpdateProfileData {
  skills?: string[]
  experienceYears?: number
  targetCountries?: string[]
  targetSectors?: string[]
  targetRoles?: string[]
  preferences?: Record<string, unknown> | null
  cvText?: string | null
}

export function useProfile() {
  const { token } = useAuth()
  const [profile, setProfile] = useState<CandidateProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!token) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const res = await apiClient.get<ProfileResponse>('/api/profile', { token })
      setProfile(res.data)
    } catch {
      setError('Erreur lors du chargement du profil')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  const updateProfile = useCallback(
    async (data: UpdateProfileData) => {
      if (!token) {
        throw new Error('Not authenticated')
      }
      const res = await apiClient.put<ProfileResponse>('/api/profile', data, { token })
      setProfile(res.data)
      return res.data
    },
    [token],
  )

  const completeOnboarding = useCallback(async () => {
    if (!token) {
      throw new Error('Not authenticated')
    }
    const res = await apiClient.post<ProfileResponse>(
      '/api/profile/complete-onboarding',
      undefined,
      { token },
    )
    setProfile(res.data)
    return res.data
  }, [token])

  const uploadCv = useCallback(
    async (file: File) => {
      if (!token) {
        throw new Error('Not authenticated')
      }
      const formData = new FormData()
      formData.append('cv', file)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/profile/cv`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      )

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: { message: 'Upload failed' } }))
        throw new Error(err.error?.message ?? 'Upload failed')
      }

      const res = (await response.json()) as ProfileResponse
      setProfile(res.data)
      return { profile: res.data, aiExtraction: res.aiExtraction ?? null }
    },
    [token],
  )

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    completeOnboarding,
    uploadCv,
    refetch: fetchProfile,
  }
}
