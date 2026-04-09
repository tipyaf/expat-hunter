import { apiClient } from '@/lib/api-client'

export interface CvReplacement {
  oldText: string
  newText: string
}

export interface CvApplicationResponse {
  applicationId: string
  cvText: string | null
  cvReplacements: CvReplacement[] | null
  language: string
  status: 'draft' | 'ready' | 'sent'
}

const CV_ENDPOINT_PREFIX = '/api/job-offers'

function cvUrl(offerId: string, path = ''): string {
  return `${CV_ENDPOINT_PREFIX}/${offerId}/cv${path}`
}

export const jobCvApi = {
  getApplication(offerId: string, token: string): Promise<{ data: CvApplicationResponse | null }> {
    return apiClient.get<{ data: CvApplicationResponse | null }>(cvUrl(offerId), { token })
  },

  generate(offerId: string, token: string): Promise<{ data: CvApplicationResponse }> {
    return apiClient.post<{ data: CvApplicationResponse }>(cvUrl(offerId, '/generate'), undefined, { token })
  },

  refine(offerId: string, instruction: string, token: string): Promise<{ data: CvApplicationResponse }> {
    return apiClient.post<{ data: CvApplicationResponse }>(cvUrl(offerId, '/refine'), { instruction }, { token })
  },

  saveCvText(offerId: string, cvText: string, token: string): Promise<{ data: CvApplicationResponse }> {
    return apiClient.put<{ data: CvApplicationResponse }>(cvUrl(offerId), { cvText }, { token })
  },

  downloadPdf(offerId: string, token: string): Promise<Blob> {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    return fetch(`${BASE_URL}${cvUrl(offerId, '/pdf')}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      if (!res.ok) throw new Error('PDF download failed')
      return res.blob()
    })
  },
}
