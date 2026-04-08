import type { ExclusionCategory, JobOfferStatus, RemoteType } from '../types/job-offer.js'
import type { JobSearchPlatform } from '../types/job-search.js'

export const JOB_OFFER_STATUSES: readonly JobOfferStatus[] = [
  'new',
  'evaluated',
  'applied',
  'archived',
  'duplicate',
  'quota_exceeded',
  'excluded',
] as const

export const EXCLUSION_CATEGORIES: readonly ExclusionCategory[] = [
  'salary',
  'location',
  'company',
  'role',
  'contract',
  'other',
] as const

export const EVALUATION_BATCH_SIZE = 10

export const MAX_DESCRIPTION_LENGTH = 5000

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

export const OFFER_BATCH_SIZE = 50

/**
 * Dedup rule thresholds for normalized string comparison.
 * Strings are lowercased, trimmed, and common suffixes stripped before comparison.
 */
export const DEDUP_RULES = {
  /** Minimum Dice coefficient for two strings to be considered a match */
  SIMILARITY_THRESHOLD: 0.85,
  /** Common company suffixes to strip before comparison */
  COMPANY_SUFFIXES: ['ltd', 'limited', 'inc', 'corp', 'corporation', 'pty', 'llc', 'gmbh', 'sa', 'sas', 'sarl'],
  /** Common location aliases to normalize */
  LOCATION_NORMALIZATIONS: new Map<string, string>([
    ['nz', 'new zealand'],
    ['au', 'australia'],
    ['uk', 'united kingdom'],
    ['us', 'united states'],
    ['usa', 'united states'],
  ]),
} as const
