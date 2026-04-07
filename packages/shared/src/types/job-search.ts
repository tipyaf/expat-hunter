export type JobSearchSeniority = 'junior' | 'intermediate' | 'senior' | 'lead' | 'indifferent'

export type JobSearchPlatform = 'seek' | 'linkedin' | 'builtin' | 'zeil'

export type JobSearchFrequency = 'manual' | 'weekly' | 'biweekly' | 'daily'

export type JobSearchContractType = 'permanent' | 'contract' | 'any'

export interface JobSearch {
  id: string
  userId: string
  roles: string[]
  countries: string[]
  cities: string[] | null
  platforms: JobSearchPlatform[]
  seniority: JobSearchSeniority
  sector: string | null
  skills: string[] | null
  salaryMin: number | null
  salaryMax: number | null
  contractType: JobSearchContractType | null
  frequency: JobSearchFrequency
  isActive: boolean
  lastRunAt: string | null
  nextRunAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateJobSearchPayload {
  roles: string[]
  countries: string[]
  cities?: string[]
  platforms: JobSearchPlatform[]
  seniority: JobSearchSeniority
  sector?: string
  skills?: string[]
  salaryMin?: number
  salaryMax?: number
  contractType?: JobSearchContractType
  frequency?: JobSearchFrequency
}

export type UpdateJobSearchPayload = Partial<CreateJobSearchPayload>
