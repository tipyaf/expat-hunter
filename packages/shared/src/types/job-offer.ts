import type { JobSearchPlatform } from './job-search.js'

export type JobOfferStatus =
  | 'new'
  | 'evaluated'
  | 'applied'
  | 'archived'
  | 'duplicate'
  | 'quota_exceeded'

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
  title: string
  descriptionRaw: string | null
  status: JobOfferStatus
  relevanceScore: number | null
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

export interface JobOfferLink {
  id: string
  offerId: string
  platform: JobSearchPlatform
  url: string
  applyUrl: string | null
  externalId: string | null
  scrapedAt: string
}
