import type { JobOfferStatus, RemoteType } from '../types/job-offer.js'
import type { JobSearchPlatform } from '../types/job-search.js'

export const JOB_OFFER_STATUSES: readonly JobOfferStatus[] = [
  'new',
  'evaluated',
  'applied',
  'archived',
  'duplicate',
  'quota_exceeded',
] as const

export const JOB_OFFER_PLATFORMS: readonly JobSearchPlatform[] = [
  'seek',
  'linkedin',
  'builtin',
  'zeil',
] as const

export const REMOTE_TYPES: readonly RemoteType[] = [
  'onsite',
  'hybrid',
  'remote',
] as const

export const FREE_MAX_OFFERS = 5

export const OFFER_PAGE_SIZE = 20
