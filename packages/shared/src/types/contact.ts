export enum ContactStatus {
  IDENTIFIED = 'identified',
  ANALYZED = 'analyzed',
  TO_CONTACT = 'to_contact',
  CONTACTED = 'contacted',
  REPLIED = 'replied',
  INTERVIEW = 'interview',
  OFFER = 'offer',
  REJECTED = 'rejected',
}

export interface Contact {
  id: string // uuid
  userId: string
  companyId: string
  sourcingRunId?: string
  fullName: string
  role: string
  email?: string
  linkedinUrl?: string
  source: string
  status: ContactStatus
  relevanceScore?: number
  relevanceLabel?: string
  relevanceReason?: string
  aiRecommendation?: string
  userOverride?: string
}
