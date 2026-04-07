'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useCallback, useEffect, useState } from 'react'

export type JobSearchSeniority = 'junior' | 'intermediate' | 'senior' | 'lead' | 'indifferent'
export type JobSearchPlatform = 'seek' | 'linkedin' | 'builtin' | 'zeil'
export type JobSearchFrequency = 'manual' | 'weekly' | 'biweekly' | 'daily'
export type JobSearchContractType = 'permanent' | 'contract' | 'any'

export interface JobSearch {
  id: string
  userId: string
  roles: string[]
  countries: string[]
  cities: string[] | null
  platforms: JobSearchPlatform[]
  seniority: JobSearchSeniority
  sector: string | null
  skills: string[] | null
  salaryMin: number | null
  salaryMax: number | null
  contractType: JobSearchContractType | null
  frequency: JobSearchFrequency
  isActive: boolean
  lastRunAt: string | null
  nextRunAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateJobSearchPayload {
  roles: string[]
  countries: string[]
  cities?: string[]
  platforms: JobSearchPlatform[]
  seniority: JobSearchSeniority
  sector?: string
  skills?: string[]
  salaryMin?: number
  salaryMax?: number
  contractType?: JobSearchContractType
  frequency?: JobSearchFrequency
}

export type UpdateJobSearchPayload = Partial<CreateJobSearchPayload>

interface JobSearchesResponse { data: JobSearch[] }
interface JobSearchResponse { data: JobSearch }

export function useJobSearches() {
  const { token } = useAuth()
  const [searches, setSearches] = useState<JobSearch[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!token) { setIsLoading(false); return }
    try {
      setIsLoading(true)
      const res = await apiClient.get<JobSearchesResponse>('/api/job-searches', { token })
      setSearches(res.data)
    } catch (error) {
      console.error('Failed to fetch job searches:', error)
    } finally { setIsLoading(false) }
  }, [token])

  const create = async (data: CreateJobSearchPayload) => {
    const res = await apiClient.post<JobSearchResponse>('/api/job-searches', data, { token: token! })
    setSearches((prev) => [res.data, ...prev])
    return res.data
  }

  const update = async (id: string, data: UpdateJobSearchPayload) => {
    const res = await apiClient.put<JobSearchResponse>(`/api/job-searches/${id}`, data, { token: token! })
    setSearches((prev) => prev.map((s) => s.id === id ? res.data : s))
    return res.data
  }

  const remove = async (id: string) => {
    await apiClient.delete(`/api/job-searches/${id}`, { token: token! })
    setSearches((prev) => prev.filter((s) => s.id !== id))
  }

  const triggerRun = async (id: string) => {
    const res = await apiClient.post<JobSearchResponse>(`/api/job-searches/${id}/run`, undefined, { token: token! })
    setSearches((prev) => prev.map((s) => s.id === id ? res.data : s))
    return res.data
  }

  useEffect(() => { void fetch() }, [fetch])

  return { searches, isLoading, refetch: fetch, create, update, remove, triggerRun }
}
