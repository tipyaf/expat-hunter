import { apiClient } from '@/lib/api-client'

interface OffersCountResponse {
  count: number
  display: string
}

export async function getOffersUnreadCount(token: string): Promise<OffersCountResponse> {
  return apiClient.get<OffersCountResponse>('/api/notifications/offers-count', { token })
}

export async function markOffersSeen(token: string): Promise<void> {
  await apiClient.post<{ success: boolean }>('/api/notifications/mark-seen', undefined, { token })
}
