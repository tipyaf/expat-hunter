import { apiClient } from '@/lib/api-client'

interface OffersCountResponse {
  count: number
  display: string
}

export async function getOffersUnreadCount(): Promise<OffersCountResponse> {
  return apiClient.get<OffersCountResponse>('/notifications/offers-count')
}

export async function markOffersSeen(): Promise<void> {
  await apiClient.post<{ success: boolean }>('/notifications/mark-seen')
}
