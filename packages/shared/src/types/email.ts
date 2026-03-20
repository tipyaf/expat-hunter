export enum EmailStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  OPENED = 'opened',
  REPLIED = 'replied',
  BOUNCED = 'bounced',
  FAILED = 'failed',
}

export enum EmailType {
  INITIAL = 'initial',
  FOLLOW_UP = 'follow_up',
  THANK_YOU = 'thank_you',
  CUSTOM = 'custom',
}

export interface EmailMessage {
  id: string // uuid
  contactId: string
  subject: string
  body: string
  type: EmailType
  status: EmailStatus
  sentAt?: Date
  scheduledAt?: Date
  openedAt?: Date
  repliedAt?: Date
}
