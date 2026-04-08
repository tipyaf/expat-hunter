import { apiClient } from '@/lib/api-client'

export type JobOfferStatus =
  | 'new'
  | 'evaluated'
  | 'interested'
  | 'applied'
  | 'interview'
  | 'offer_received'
  | 'accepted'
  | 'rejected'
  | 'excluded'
  | 'expired'
  | 'archived'
  | 'duplicate'
  | 'quota_exceeded'

export type JobOfferTab = 'new' | 'applied' | 'archived'

export const NEW_TAB_STATUSES: readonly JobOfferStatus[] = ['new', 'evaluated', 'interested'] as const
export const APPLIED_TAB_STATUSES: readonly JobOfferStatus[] = ['applied', 'interview', 'offer_received', 'accepted', 'rejected'] as const
export const ARCHIVED_TAB_STATUSES: readonly JobOfferStatus[] = ['excluded', 'expired', 'archived', 'duplicate', 'quota_exceeded'] as const

export const TAB_STATUS_MAP: Record<JobOfferTab, readonly JobOfferStatus[]> = {
  new: NEW_TAB_STATUSES,
  applied: APPLIED_TAB_STATUSES,
  archived: ARCHIVED_TAB_STATUSES,
} as const

export const JOB_OFFER_STATUSES: readonly JobOfferStatus[] = [
  'new', 'evaluated', 'interested', 'applied', 'interview', 'offer_received',
  'accepted', 'rejected', 'excluded', 'expired', 'archived', 'duplicate', 'quota_exceeded',
] as const

export interface JobOfferResponse {
  id: string
  searchId: string
  title: string
  companyName: string | null
  descriptionRaw: string | null
  status: JobOfferStatus
  relevanceScore: number | null
  matchSummary: string | null
  selectionReason: string | null
  applicationAdvice: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  location: string | null
  remoteType: string | null
  publicationDates: string[]
  closingDate: string | null
  contactEmail: string | null
  isRepublished: boolean
  links: Array<{
    id: string
    platform: string
    url: string
    applyUrl: string | null
    externalId: string | null
    scrapedAt: string
  }>
  company: {
    id: string
    name: string
    sector: string | null
    size: string | null
    companyType: string
  } | null
  createdAt: string
  updatedAt: string
}

export interface JobOffersListResponse {
  data: JobOfferResponse[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

export interface CrossContactResponse {
  data: {
    hasCrossContact: boolean
  }
}

interface ListOffersParams {
  searchId?: string
  status?: string
  page?: number
}

export function buildJobOffersQueryString(params: ListOffersParams): string {
  const qs = new URLSearchParams()
  if (params.searchId) qs.set('search_id', params.searchId)
  if (params.status) qs.set('status', params.status)
  if (params.page && params.page > 1) qs.set('page', String(params.page))
  return qs.toString()
}

export const jobOffersApi = {
  list(params: ListOffersParams, token: string): Promise<JobOffersListResponse> {
    const qs = buildJobOffersQueryString(params)
    return apiClient.get<JobOffersListResponse>(`/api/job-offers?${qs}`, { token })
  },

  updateStatus(offerId: string, status: JobOfferStatus, token: string): Promise<{ data: JobOfferResponse }> {
    return apiClient.patch<{ data: JobOfferResponse }>(`/api/job-offers/${offerId}/status`, { status }, { token })
  },

  getCrossContacts(offerId: string, token: string): Promise<CrossContactResponse> {
    return apiClient.get<CrossContactResponse>(`/api/job-offers/${offerId}/cross-contacts`, { token })
  },
}
