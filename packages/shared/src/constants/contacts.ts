/**
 * Placeholder contact names created by scrapers when no real person name is found.
 * These contacts exist in DB for enrichment pipeline use but should be hidden from API responses.
 *
 * Includes both lowercase (for dedup matching) and title-case (for DB whereNotIn) forms.
 * The controller also generates title-case variants to cover additional cases.
 */
export const PLACEHOLDER_CONTACT_NAMES = [
  'Hiring Manager',
  'hiring manager',
  'contact',
  'unknown',
  'hr manager',
  'recruiter',
  'team',
  'hiring',
  'jobs',
  'talent',
  'recruitment',
  'careers',
  'hr',
  'info',
  'support',
  'connect',
  'admin',
  'office',
  'reception',
  'enquiries',
  'general',
  'hello',
  'apply',
  'people',
  'human resources',
  'talent acquisition',
  'people operations',
] as const

export type PlaceholderContactName = (typeof PLACEHOLDER_CONTACT_NAMES)[number]
