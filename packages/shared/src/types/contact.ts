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
  sourcingRunId: string | null
  fullName: string
  role: string
  email: string | null
  linkedinUrl: string | null
  source: string
  status: ContactStatus
  relevanceScore: number | null
  relevanceLabel: string | null
  relevanceReason: string | null
  aiRecommendation: string | null
  userOverride: boolean
}
