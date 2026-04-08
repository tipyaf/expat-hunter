import type { JobSearchPlatform } from './job-search.js'

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

export type ExclusionCategory =
  | 'salary'
  | 'location'
  | 'company'
  | 'role'
  | 'contract'
  | 'other'

export type RemoteType = 'onsite' | 'hybrid' | 'remote'

export interface RawJobOffer {
  title: string
  company: string
  location: string
  url: string
  platform: JobSearchPlatform
  externalId: string | null
  salaryMin: number | null
  salaryMax: number | null
  currency: string | null
  closingDate: string | null
  description: string | null
  remoteType: RemoteType | null
  contactEmail: string | null
  applyUrl: string | null
}

export interface JobOffer {
  id: string
  searchId: string
  companyCacheId: string | null
  companyName: string | null
  title: string
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
  remoteType: RemoteType | null
  publicationDates: string[]
  closingDate: string | null
  contactEmail: string | null
  isRepublished: boolean
  createdAt: string
  updatedAt: string
}

export type CompanyType = 'recruitment_agency' | 'hiring_company' | 'consulting' | 'unknown'

export interface CompanyCache {
  id: string
  slug: string
  country: string
  name: string
  sector: string | null
  size: string | null
  companyType: CompanyType
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export interface AccreditationCache {
  id: string
  slug: string
  country: string
  isAccredited: boolean
  source: string | null
  checkedAt: string
  createdAt: string
  updatedAt: string
}

export interface JobOfferLink {
  id: string
  offerId: string
  platform: JobSearchPlatform
  url: string
  applyUrl: string | null
  externalId: string | null
  scrapedAt: string
}
