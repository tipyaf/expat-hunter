import Contact from '#models/contact'

export interface PipelineColumn {
  key: string
  statuses: string[]
  contacts: PipelineContact[]
  count: number
}

export interface PipelineContact {
  id: string
  fullName: string
  role: string
  email: string | null
  emailSource: string | null
  emailConfidence: number | null
  emailStatus: string | null
  status: string
  relevanceScore: number | null
  relevanceLabel: string | null
  relevanceReason: string | null
  aiRecommendation: string | null
  scoreBreakdown: Record<string, unknown> | null
  company: {
    id: string
    name: string
    sector: string | null
    country: string
    visaSponsorStatus: string | null
    visaSponsorCountries: string[] | null
  } | null
  lastEmailStatus: string | null
  lastEmailDate: string | null
}

const PIPELINE_COLUMNS = [
  { key: 'found', statuses: ['identified', 'analyzed'] },
  { key: 'to_contact', statuses: ['to_contact'] },
  { key: 'contacted', statuses: ['contacted'] },
  { key: 'in_discussion', statuses: ['replied', 'interview'] },
  { key: 'done', statuses: ['offer', 'rejected'] },
] as const

export default class PipelineService {
  async getBoard(userId: string): Promise<PipelineColumn[]> {
    const contacts = await Contact.query()
      .where('userId', userId)
      .preload('company')
      .preload('emails', (q) => q.orderBy('createdAt', 'desc').limit(1))
      .orderBy('updatedAt', 'desc')
      .limit(500)

    return PIPELINE_COLUMNS.map((col) => {
      const colContacts = contacts
        .filter((c) => (col.statuses as readonly string[]).includes(c.status))
        .map((c) => this.serialize(c))

      return {
        key: col.key,
        statuses: [...col.statuses],
        contacts: colContacts,
        count: colContacts.length,
      }
    })
  }

  async getStats(userId: string): Promise<Record<string, number>> {
    const rows = await Contact.query()
      .where('userId', userId)
      .select('status')
      .count('* as count')
      .groupBy('status')

    const stats: Record<string, number> = {}
    for (const row of rows) {
      stats[row.status] = Number(row.$extras.count)
    }
    return stats
  }

  private serialize(contact: Contact): PipelineContact {
    const lastEmail = contact.emails?.[0] ?? null
    return {
      id: contact.id,
      fullName: contact.fullName,
      role: contact.role,
      email: contact.email,
      emailSource: contact.emailSource,
      emailConfidence: contact.emailConfidence,
      emailStatus: contact.emailStatus,
      status: contact.status,
      relevanceScore: contact.relevanceScore,
      relevanceLabel: contact.relevanceLabel,
      relevanceReason: contact.relevanceReason,
      aiRecommendation: contact.aiRecommendation,
      scoreBreakdown: contact.scoreBreakdown,
      company: contact.company
        ? {
            id: contact.company.id,
            name: contact.company.name,
            sector: contact.company.sector,
            country: contact.company.country,
            visaSponsorStatus: contact.company.visaSponsorStatus,
            visaSponsorCountries: contact.company.visaSponsorCountries,
          }
        : null,
      lastEmailStatus: lastEmail?.status ?? null,
      lastEmailDate: lastEmail?.createdAt?.toISO() ?? null,
    }
  }
}
