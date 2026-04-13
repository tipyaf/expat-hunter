import { apiClient } from '@/lib/api-client'

export interface CustomPlatform {
  id: string
  userId: string
  name: string
  url: string
  country: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PlatformSuggestion {
  name: string
  url: string
  description: string
}

export interface CreateCustomPlatformPayload {
  name: string
  url: string
  country?: string
}

interface PlatformsResponse { data: CustomPlatform[] }
interface PlatformResponse { data: CustomPlatform }
interface SuggestionsResponse { data: PlatformSuggestion[] }

export const customPlatformApi = {
  list: (token: string): Promise<PlatformsResponse> =>
    apiClient.get<PlatformsResponse>('/api/custom-platforms', { token }),

  create: (token: string, payload: CreateCustomPlatformPayload): Promise<PlatformResponse> =>
    apiClient.post<PlatformResponse>('/api/custom-platforms', payload, { token }),

  remove: (token: string, id: string): Promise<void> =>
    apiClient.delete(`/api/custom-platforms/${id}`, { token }),

  suggestions: (token: string, country: string): Promise<SuggestionsResponse> =>
    apiClient.get<SuggestionsResponse>(`/api/platforms/suggestions?country=${encodeURIComponent(country)}`, { token }),
}
