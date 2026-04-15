// Types
export type { User, CandidateProfile } from './types/user.js'
export type { Company } from './types/company.js'
export type { Contact } from './types/contact.js'
export { ContactStatus } from './types/contact.js'
export type { EmailMessage } from './types/email.js'
export { EmailStatus, EmailType } from './types/email.js'
export type { SourcingRun } from './types/sourcing.js'
export { SourcingStatus } from './types/sourcing.js'
export type { PipelineColumn } from './types/pipeline.js'
export { PIPELINE_COLUMNS, STATUS_TO_COLUMN } from './types/pipeline.js'
export type { ApiResponse, PaginatedResponse, QuotaInfo } from './types/api-responses.js'

// Plans
export type { UserPlan, QuotaType } from './constants/plans.js'
export { PLAN_FREE, PLAN_PREMIUM, FREE_QUOTAS } from './constants/plans.js'

// Constants
export {
  PIPELINE_STATUSES,
  ACTIVE_STATUSES,
  TERMINAL_STATUSES,
} from './constants/pipeline-statuses.js'
export type { RelevanceLevel } from './constants/relevance-levels.js'
export { RELEVANCE_LEVELS, getRelevanceLevel } from './constants/relevance-levels.js'
export type { SupportedCountry } from './constants/countries.js'
export {
  SUPPORTED_COUNTRIES,
  getCountryByCode,
  getCountryCodes,
} from './constants/countries.js'
export type { PlaceholderContactName } from './constants/contacts.js'
export { PLACEHOLDER_CONTACT_NAMES } from './constants/contacts.js'

// Job offers
export type {
  RawJobOffer,
  JobOffer,
  JobOfferLink,
  JobOfferStatus,
  RemoteType,
  ExclusionCategory,
  CompanyType,
  CompanyCache,
  AccreditationCache,
} from './types/job-offer.js'
export type { JobOfferTab } from './constants/job-offer.js'
export {
  JOB_OFFER_STATUSES,
  JOB_OFFER_PLATFORMS,
  REMOTE_TYPES,
  FREE_MAX_OFFERS,
  OFFER_PAGE_SIZE,
  OFFER_BATCH_SIZE,
  DEDUP_RULES,
  EXCLUSION_CATEGORIES,
  EVALUATION_BATCH_SIZE,
  MAX_DESCRIPTION_LENGTH,
  COMPANY_TYPES,
  CACHE_TTL_DAYS,
  ENRICHMENT_BATCH_SIZE,
  MAX_COMPANY_NAME_LENGTH,
  NEW_TAB_STATUSES,
  APPLIED_TAB_STATUSES,
  ARCHIVED_TAB_STATUSES,
  TAB_STATUS_MAP,
} from './constants/job-offer.js'

// Job search
export type {
  JobSearch,
  JobSearchSeniority,
  JobSearchPlatform,
  JobSearchFrequency,
  JobSearchContractType,
  CreateJobSearchPayload,
  UpdateJobSearchPayload,
} from './types/job-search.js'
export {
  SENIORITY_VALUES,
  SUPPORTED_PLATFORMS,
  FREQUENCY_VALUES,
  MAX_ROLES_PER_SEARCH,
  MAX_ROLE_LENGTH,
  FREE_MAX_SEARCHES,
  PREMIUM_MAX_SEARCHES,
  FREQUENCY_INTERVALS_DAYS,
  FREE_ALLOWED_FREQUENCIES,
} from './constants/job-search.js'

// Utilities
export { computeNextRunAt } from './utils/next-run-at.js'

// Custom platforms
export type {
  CustomPlatform,
  CreateCustomPlatformPayload,
  PlatformSuggestion,
} from './types/custom-platform.js'
export {
  PLATFORM_SUGGESTIONS,
  FREE_MAX_CUSTOM_PLATFORMS,
  MAX_PLATFORM_NAME_LENGTH,
  MAX_PLATFORM_URL_LENGTH,
} from './constants/platform-suggestions.js'
