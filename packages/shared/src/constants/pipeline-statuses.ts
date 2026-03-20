import { ContactStatus } from '../types/contact'

export const PIPELINE_STATUSES = {
  INITIAL: [ContactStatus.IDENTIFIED, ContactStatus.ANALYZED],
  ACTIONABLE: [ContactStatus.TO_CONTACT],
  IN_PROGRESS: [ContactStatus.CONTACTED, ContactStatus.REPLIED],
  ADVANCED: [ContactStatus.INTERVIEW, ContactStatus.OFFER],
  CLOSED: [ContactStatus.REJECTED],
} as const

export const ACTIVE_STATUSES = [
  ContactStatus.TO_CONTACT,
  ContactStatus.CONTACTED,
  ContactStatus.REPLIED,
  ContactStatus.INTERVIEW,
] as const

export const TERMINAL_STATUSES = [ContactStatus.OFFER, ContactStatus.REJECTED] as const
