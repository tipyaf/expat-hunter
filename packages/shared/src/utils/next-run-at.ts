import type { JobSearchFrequency } from '../types/job-search.js'

/**
 * Frequency → interval in days.
 * biweekly = twice per week = every 3.5 days.
 */
export const FREQUENCY_INTERVALS_DAYS: Record<Exclude<JobSearchFrequency, 'manual'>, number> = {
  daily: 1,
  biweekly: 3.5,
  weekly: 7,
} as const

/**
 * Frequencies allowed for free-plan users.
 */
export const FREE_ALLOWED_FREQUENCIES: readonly JobSearchFrequency[] = [
  'manual',
  'weekly',
] as const

/**
 * Pure function: compute the next run date for a recurring job search.
 *
 * @param frequency - The search frequency ('manual' | 'weekly' | 'biweekly' | 'daily')
 * @param referenceDate - The date to compute from (typically now or last run)
 * @returns ISO 8601 string of next run date, or null if frequency is 'manual'
 */
export function computeNextRunAt(
  frequency: JobSearchFrequency,
  referenceDate: Date
): string | null {
  if (frequency === 'manual') {
    return null
  }

  const intervalDays = FREQUENCY_INTERVALS_DAYS[frequency]
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000
  const nextRun = new Date(referenceDate.getTime() + intervalMs)

  return nextRun.toISOString()
}
