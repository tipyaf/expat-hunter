export enum SourcingStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface SourcingRun {
  id: string // uuid
  userId: string
  status: SourcingStatus
  country: string
  sector?: string
  sources: string[]
  contactsFound: number
  startedAt?: Date
  completedAt?: Date
  errors?: string[]
}
