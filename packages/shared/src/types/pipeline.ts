import { ContactStatus } from './contact'

export interface PipelineColumn {
  id: string
  label: string
  statuses: ContactStatus[]
  order: number
}

export const PIPELINE_COLUMNS: PipelineColumn[] = [
  {
    id: 'identified',
    label: 'Identifiés',
    statuses: [ContactStatus.IDENTIFIED],
    order: 0,
  },
  {
    id: 'analyzed',
    label: 'Analysés',
    statuses: [ContactStatus.ANALYZED],
    order: 1,
  },
  {
    id: 'to_contact',
    label: 'À contacter',
    statuses: [ContactStatus.TO_CONTACT],
    order: 2,
  },
  {
    id: 'contacted',
    label: 'Contactés',
    statuses: [ContactStatus.CONTACTED],
    order: 3,
  },
  {
    id: 'replied',
    label: 'Répondu',
    statuses: [ContactStatus.REPLIED],
    order: 4,
  },
  {
    id: 'interview',
    label: 'Entretien',
    statuses: [ContactStatus.INTERVIEW],
    order: 5,
  },
  {
    id: 'offer',
    label: 'Offre',
    statuses: [ContactStatus.OFFER],
    order: 6,
  },
  {
    id: 'rejected',
    label: 'Rejeté',
    statuses: [ContactStatus.REJECTED],
    order: 7,
  },
]

export const STATUS_TO_COLUMN: Record<ContactStatus, string> = {
  [ContactStatus.IDENTIFIED]: 'identified',
  [ContactStatus.ANALYZED]: 'analyzed',
  [ContactStatus.TO_CONTACT]: 'to_contact',
  [ContactStatus.CONTACTED]: 'contacted',
  [ContactStatus.REPLIED]: 'replied',
  [ContactStatus.INTERVIEW]: 'interview',
  [ContactStatus.OFFER]: 'offer',
  [ContactStatus.REJECTED]: 'rejected',
}
