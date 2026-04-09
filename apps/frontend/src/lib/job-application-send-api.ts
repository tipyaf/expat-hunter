import { apiClient } from '@/lib/api-client'

export interface ApplicationEmailStatus {
  hasEmail: boolean
  emailText: string | null
  status: 'draft' | 'ready' | 'sent'
  sentAt: string | null
  sentToEmail: string | null
}

export interface GenerateEmailResponse {
  applicationId: string
  emailText: string
  status: string
}

export interface SendApplicationResponse {
  applicationId: string
  status: string
  sentAt: string | null
  sentToEmail: string | null
}

export interface DraftFollowUpResponse {
  emailText: string
}

const ENDPOINT_PREFIX = '/api/job-offers'

function emailUrl(offerId: string, path = ''): string {
  return `${ENDPOINT_PREFIX}/${offerId}/application-email${path}`
}

export const jobApplicationSendApi = {
  getStatus(offerId: string, token: string): Promise<{ data: ApplicationEmailStatus }> {
    return apiClient.get<{ data: ApplicationEmailStatus }>(emailUrl(offerId), { token })
  },

  generateEmail(offerId: string, token: string): Promise<{ data: GenerateEmailResponse }> {
    return apiClient.post<{ data: GenerateEmailResponse }>(emailUrl(offerId, '/generate'), undefined, { token })
  },

  sendApplication(offerId: string, recipientEmail: string, token: string): Promise<{ data: SendApplicationResponse }> {
    return apiClient.post<{ data: SendApplicationResponse }>(emailUrl(offerId, '/send'), { recipientEmail }, { token })
  },

  draftFollowUp(
    offerId: string,
    contactId: string,
    type: 'follow_up' | 'thank_you' | 'status_check',
    context: string,
    token: string
  ): Promise<{ data: DraftFollowUpResponse }> {
    return apiClient.post<{ data: DraftFollowUpResponse }>(
      `${ENDPOINT_PREFIX}/${offerId}/contacts/${contactId}/email`,
      { type, context },
      { token }
    )
  },
}
