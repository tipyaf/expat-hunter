import { apiClient, ApiError } from '@/lib/api-client'

export interface CoverLetterApplicationResponse {
  applicationId: string
  coverLetterText: string | null
  language: string
  status: 'draft' | 'ready' | 'sent'
}

const ENDPOINT_PREFIX = '/api/job-offers'

function coverLetterUrl(offerId: string, path = ''): string {
  return `${ENDPOINT_PREFIX}/${offerId}/cover-letter${path}`
}

export const jobCoverLetterApi = {
  getApplication(offerId: string, token: string): Promise<{ data: CoverLetterApplicationResponse | null }> {
    return apiClient.get<{ data: CoverLetterApplicationResponse | null }>(coverLetterUrl(offerId), { token })
  },

  generate(offerId: string, token: string): Promise<{ data: CoverLetterApplicationResponse }> {
    return apiClient.post<{ data: CoverLetterApplicationResponse }>(coverLetterUrl(offerId, '/generate'), undefined, { token })
  },

  refine(offerId: string, instruction: string, token: string): Promise<{ data: CoverLetterApplicationResponse }> {
    return apiClient.post<{ data: CoverLetterApplicationResponse }>(coverLetterUrl(offerId, '/refine'), { instruction }, { token })
  },

  saveCoverLetterText(offerId: string, coverLetterText: string, token: string): Promise<{ data: CoverLetterApplicationResponse }> {
    return apiClient.put<{ data: CoverLetterApplicationResponse }>(coverLetterUrl(offerId), { coverLetterText }, { token })
  },

  downloadPdf(offerId: string, token: string): Promise<Blob> {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    return fetch(`${BASE_URL}${coverLetterUrl(offerId, '/pdf')}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      if (!res.ok) throw new ApiError(res.status, 'PDF download failed')
      return res.blob()
    })
  },
}
