import Contact from '#models/contact'
import ContactMovementService from '#services/contact_movement_service'

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

// 6 columns: found → to_contact → contacted → in_discussion → interview → done
const PIPELINE_COLUMNS = [
  { key: 'found', statuses: ['identified', 'analyzed'] },
  { key: 'to_contact', statuses: ['to_contact'] },
  { key: 'contacted', statuses: ['contacted'] },
  { key: 'in_discussion', statuses: ['replied'] },
  { key: 'interview', statuses: ['interview'] },
  { key: 'done', statuses: ['offer', 'rejected'] },
] as const

export default class PipelineService {
  private movementService = new ContactMovementService()

  async getBoard(userId: string): Promise<PipelineColumn[]> {
    const { contactIds: blockedContactIds, companyIds: blockedCompanyIds } =
      await this.movementService.getBlockedIds(userId)

    const query = Contact.query()
      .where('userId', userId)
      .preload('company')
      .preload('emails', (q) => q.orderBy('createdAt', 'desc').limit(1))
      .orderBy('updatedAt', 'desc')
      .limit(500)

    if (blockedContactIds.length > 0) {
      query.whereNotIn('id', blockedContactIds)
    }

    const contacts = await query

    // Also exclude contacts whose company is blocked
    const filtered = blockedCompanyIds.length > 0
      ? contacts.filter((c) => !c.companyId || !blockedCompanyIds.includes(c.companyId))
      : contacts

    return PIPELINE_COLUMNS.map((col) => {
      const colContacts = filtered
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
