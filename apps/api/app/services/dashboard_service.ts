import Contact from '#models/contact'
import EmailMessage from '#models/email_message'
import SourcingRun from '#models/sourcing_run'
import db from '@adonisjs/lucid/services/db'

export interface DashboardAction {
  type: 'emails_to_validate' | 'replies_received' | 'sourcing_completed'
  count: number
  label: string
  href: string
}

export interface DashboardStats {
  contacts: number
  emailsSent: number
  replies: number
}

export default class DashboardService {
  async getActions(userId: string): Promise<DashboardAction[]> {
    const actions: DashboardAction[] = []

    const [draftCount, repliedCount, completedSourcing] = await Promise.all([
      EmailMessage.query()
        .where('status', 'draft')
        .whereHas('contact', (q) => q.where('userId', userId))
        .count('* as count')
        .first(),
      Contact.query()
        .where('userId', userId)
        .where('status', 'replied')
        .count('* as count')
        .first(),
      SourcingRun.query()
        .where('userId', userId)
        .where('status', 'completed')
        .orderBy('completedAt', 'desc')
        .first(),
    ])

    const drafts = Number(draftCount?.$extras.count ?? 0)
    if (drafts > 0) {
      actions.push({
        type: 'emails_to_validate',
        count: drafts,
        label: 'emails_to_validate',
        href: '/emails?status=draft',
      })
    }

    const replies = Number(repliedCount?.$extras.count ?? 0)
    if (replies > 0) {
      actions.push({
        type: 'replies_received',
        count: replies,
        label: 'replies_received',
        href: '/contacts?status=replied',
      })
    }

    if (completedSourcing && completedSourcing.contactsFound > 0) {
      const unanalyzed = await Contact.query()
        .where('userId', userId)
        .where('sourcingRunId', completedSourcing.id)
        .where('status', 'identified')
        .count('* as count')
        .first()

      const unanalyzedCount = Number(unanalyzed?.$extras.count ?? 0)
      if (unanalyzedCount > 0) {
        actions.push({
          type: 'sourcing_completed',
          count: unanalyzedCount,
          label: 'sourcing_completed',
          href: '/contacts?status=identified',
        })
      }
    }

    return actions
  }

  async getStats(userId: string): Promise<DashboardStats> {
    const [contactCount, sentCount, replyCount] = await Promise.all([
      Contact.query()
        .where('userId', userId)
        .count('* as count')
        .first(),
      EmailMessage.query()
        .where('status', 'sent')
        .whereHas('contact', (q) => q.where('userId', userId))
        .count('* as count')
        .first(),
      Contact.query()
        .where('userId', userId)
        .where('status', 'replied')
        .count('* as count')
        .first(),
    ])

    return {
      contacts: Number(contactCount?.$extras.count ?? 0),
      emailsSent: Number(sentCount?.$extras.count ?? 0),
      replies: Number(replyCount?.$extras.count ?? 0),
    }
  }
}
