import type { JobSearchSeniority, JobSearchPlatform, JobSearchFrequency } from '../types/job-search.js'

export const SENIORITY_VALUES: readonly JobSearchSeniority[] = [
  'junior',
  'intermediate',
  'senior',
  'lead',
  'indifferent',
] as const

export const SUPPORTED_PLATFORMS: readonly JobSearchPlatform[] = [
  'seek',
  'linkedin',
  'builtin',
  'zeil',
] as const

export const FREQUENCY_VALUES: readonly JobSearchFrequency[] = [
  'manual',
  'weekly',
  'biweekly',
  'daily',
] as const

export const MAX_ROLES_PER_SEARCH = 10
export const MAX_ROLE_LENGTH = 100
export const FREE_MAX_SEARCHES = 1
export const PREMIUM_MAX_SEARCHES = 3

/**
 * Re-export frequency-related constants from the pure utility module.
 * These are the canonical source for interval mapping and plan restrictions.
 */
export {
  FREQUENCY_INTERVALS_DAYS,
  FREE_ALLOWED_FREQUENCIES,
} from '../utils/next-run-at.js'
