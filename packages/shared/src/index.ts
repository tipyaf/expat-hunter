// Types
export type { User, CandidateProfile } from './types/user'
export type { Company } from './types/company'
export type { Contact } from './types/contact'
export { ContactStatus } from './types/contact'
export type { EmailMessage } from './types/email'
export { EmailStatus, EmailType } from './types/email'
export type { SourcingRun } from './types/sourcing'
export { SourcingStatus } from './types/sourcing'
export type { PipelineColumn } from './types/pipeline'
export { PIPELINE_COLUMNS, STATUS_TO_COLUMN } from './types/pipeline'
export type { ApiResponse, PaginatedResponse, QuotaInfo } from './types/api-responses'

// Plans
export type { UserPlan, QuotaType } from './constants/plans'
export { PLAN_FREE, PLAN_PREMIUM, FREE_QUOTAS } from './constants/plans'

// Constants
export {
  PIPELINE_STATUSES,
  ACTIVE_STATUSES,
  TERMINAL_STATUSES,
} from './constants/pipeline-statuses'
export type { RelevanceLevel } from './constants/relevance-levels'
export { RELEVANCE_LEVELS, getRelevanceLevel } from './constants/relevance-levels'
export type { SupportedCountry } from './constants/countries'
export {
  SUPPORTED_COUNTRIES,
  getCountryByCode,
  getCountryCodes,
} from './constants/countries'
export type { PlaceholderContactName } from './constants/contacts'
export { PLACEHOLDER_CONTACT_NAMES } from './constants/contacts'

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
} from './types/job-offer'
export type { JobOfferTab } from './constants/job-offer'
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
} from './constants/job-offer'

// Job search
export type {
  JobSearch,
  JobSearchSeniority,
  JobSearchPlatform,
  JobSearchFrequency,
  JobSearchContractType,
  CreateJobSearchPayload,
  UpdateJobSearchPayload,
} from './types/job-search'
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
} from './constants/job-search'

// Utilities
export { computeNextRunAt } from './utils/next-run-at'

// Custom platforms
export type {
  CustomPlatform,
  CreateCustomPlatformPayload,
  PlatformSuggestion,
} from './types/custom-platform'
export {
  PLATFORM_SUGGESTIONS,
  FREE_MAX_CUSTOM_PLATFORMS,
  MAX_PLATFORM_NAME_LENGTH,
  MAX_PLATFORM_URL_LENGTH,
} from './constants/platform-suggestions'
