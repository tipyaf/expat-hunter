import type { PlatformSuggestion } from '../types/custom-platform.js'

/**
 * Platform suggestions by country code.
 * Users see these when configuring custom platforms for a specific country.
 */
export const PLATFORM_SUGGESTIONS: Record<string, PlatformSuggestion[]> = {
  NZ: [
    { name: 'TradeMe Jobs', url: 'https://www.trademe.co.nz/a/jobs', description: 'NZ largest job board' },
    { name: 'Seek NZ', url: 'https://www.seek.co.nz', description: 'Popular NZ job search' },
    { name: 'MyJobSpace', url: 'https://www.myjobspace.co.nz', description: 'NZ job listings' },
  ],
  AU: [
    { name: 'Seek AU', url: 'https://www.seek.com.au', description: 'Australia largest job board' },
    { name: 'Indeed AU', url: 'https://au.indeed.com', description: 'Indeed Australia' },
    { name: 'Jora', url: 'https://www.jora.com', description: 'Australian job aggregator' },
  ],
  UK: [
    { name: 'Reed', url: 'https://www.reed.co.uk', description: 'UK job board' },
    { name: 'Totaljobs', url: 'https://www.totaljobs.com', description: 'UK job listings' },
    { name: 'CV-Library', url: 'https://www.cv-library.co.uk', description: 'UK CV and jobs' },
  ],
  US: [
    { name: 'Indeed US', url: 'https://www.indeed.com', description: 'US largest job board' },
    { name: 'Glassdoor', url: 'https://www.glassdoor.com', description: 'Jobs + company reviews' },
    { name: 'ZipRecruiter', url: 'https://www.ziprecruiter.com', description: 'US job marketplace' },
  ],
  CA: [
    { name: 'Indeed CA', url: 'https://ca.indeed.com', description: 'Indeed Canada' },
    { name: 'Job Bank', url: 'https://www.jobbank.gc.ca', description: 'Government of Canada job board' },
    { name: 'Workopolis', url: 'https://www.workopolis.com', description: 'Canadian job listings' },
  ],
  FR: [
    { name: 'Indeed FR', url: 'https://fr.indeed.com', description: 'Indeed France' },
    { name: 'Pôle Emploi', url: 'https://www.francetravail.fr', description: 'Service public de emploi' },
    { name: 'Welcome to the Jungle', url: 'https://www.welcometothejungle.com', description: 'Tech & startup jobs' },
  ],
  DE: [
    { name: 'StepStone', url: 'https://www.stepstone.de', description: 'Germany job board' },
    { name: 'Indeed DE', url: 'https://de.indeed.com', description: 'Indeed Germany' },
    { name: 'XING', url: 'https://www.xing.com/jobs', description: 'German professional network' },
  ],
} as const

/** Maximum custom platforms for free users */
export const FREE_MAX_CUSTOM_PLATFORMS = 3

/** Maximum platform name length */
export const MAX_PLATFORM_NAME_LENGTH = 255

/** Maximum platform URL length */
export const MAX_PLATFORM_URL_LENGTH = 2048
