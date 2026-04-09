import { apiClient } from '@/lib/api-client'

export interface RecruitmentContact {
  id: string
  offerId: string
  userId: string
  name: string
  role: string | null
  email: string | null
  linkedinUrl: string | null
  notes: string | null
  leadId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateRecruitmentContactPayload {
  name: string
  role?: string
  email?: string
  linkedinUrl?: string
  notes?: string
}

export interface UpdateRecruitmentContactPayload {
  name?: string
  role?: string | null
  email?: string | null
  linkedinUrl?: string | null
  notes?: string | null
}

const ENDPOINT_PREFIX = '/api/job-offers'

function contactsUrl(offerId: string, contactId?: string): string {
  const base = `${ENDPOINT_PREFIX}/${offerId}/contacts`
  return contactId ? `${base}/${contactId}` : base
}

export const jobRecruitmentContactsApi = {
  list(offerId: string, token: string): Promise<{ data: RecruitmentContact[] }> {
    return apiClient.get<{ data: RecruitmentContact[] }>(contactsUrl(offerId), { token })
  },

  create(offerId: string, payload: CreateRecruitmentContactPayload, token: string): Promise<{ data: RecruitmentContact }> {
    return apiClient.post<{ data: RecruitmentContact }>(contactsUrl(offerId), payload, { token })
  },

  update(offerId: string, contactId: string, payload: UpdateRecruitmentContactPayload, token: string): Promise<{ data: RecruitmentContact }> {
    return apiClient.put<{ data: RecruitmentContact }>(contactsUrl(offerId, contactId), payload, { token })
  },

  remove(offerId: string, contactId: string, token: string): Promise<void> {
    return apiClient.delete<void>(contactsUrl(offerId, contactId), { token })
  },

  reProspect(offerId: string, contactId: string, token: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`${contactsUrl(offerId, contactId)}/re-prospect`, undefined, { token })
  },
}
