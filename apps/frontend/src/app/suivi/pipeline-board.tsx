'use client'

import { ContactSourceBadge } from '@/components/ui/contact-source-badge'
import { EmailStatusBadge } from '@/components/ui/email-status-badge'
import { ScoreBreakdown } from '@/components/ui/score-breakdown'
import { VisaSponsorBadge } from '@/components/ui/visa-sponsor-badge'
import type { PipelineContact } from '@/hooks/use-pipeline'
import { useTranslations } from 'next-intl'
import { Ban } from 'lucide-react'

function relevanceBadge(label: string | null) {
  switch (label) {
    case 'very_relevant': return 'bg-green-100 text-green-700'
    case 'relevant': return 'bg-blue-100 text-blue-700'
    case 'to_review': return 'bg-yellow-100 text-yellow-700'
    case 'not_relevant': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-500'
  }
}

function emailStatusBadge(status: string | null) {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-600'
    case 'approved': return 'bg-blue-100 text-blue-600'
    case 'sent': return 'bg-indigo-100 text-indigo-600'
    case 'opened': return 'bg-purple-100 text-purple-600'
    case 'replied': return 'bg-green-100 text-green-600'
    case 'bounced': return 'bg-red-100 text-red-600'
    default: return ''
  }
}

const COLUMN_COLORS: Record<string, string> = {
  found: 'border-t-gray-400',
  to_contact: 'border-t-blue-500',
  contacted: 'border-t-indigo-500',
  in_discussion: 'border-t-purple-500',
  interview: 'border-t-yellow-500',
  done: 'border-t-green-500',
}

function ContactCard({
  contact,
  onDragStart,
  onBlock,
  onCardClick,
}: {
  contact: PipelineContact
  onDragStart: (e: React.DragEvent, contactId: string) => void
  onBlock: (contact: PipelineContact) => void
  onCardClick: (contactId: string) => void
}) {
  const t = useTranslations('pipeline')

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, contact.id)}
      onClick={() => onCardClick(contact.id)}
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-light)] p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow group"
    >
      {/* Name + relevance + block */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-medium text-[var(--color-text-main)] truncate flex-1">
          {contact.fullName}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {contact.relevanceLabel && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${relevanceBadge(contact.relevanceLabel)}`}>
              {t(`relevance_${contact.relevanceLabel}`)}
            </span>
          )}
          <button
            type="button"
            onClick={() => onBlock(contact)}
            title={t('blockContact')}
            className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 text-[var(--color-text-muted)] hover:text-red-500"
          >
            <Ban className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Role */}
      <p className="text-xs text-[var(--color-text-muted)] truncate">{contact.role}</p>

      {/* Company + visa badge */}
      {contact.company && (
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <p className="text-xs text-[var(--color-text-muted)] truncate">
            {contact.company.name}
            {contact.company.country && ` · ${contact.company.country}`}
          </p>
          <VisaSponsorBadge
            status={contact.company.visaSponsorStatus}
            countries={contact.company.visaSponsorCountries}
          />
        </div>
      )}

      {/* Email + source + status */}
      {contact.email && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[110px]">
            {contact.email}
          </span>
          <ContactSourceBadge source={contact.emailSource} />
          <EmailStatusBadge
            status={contact.emailStatus}
            confidence={contact.emailConfidence}
          />
        </div>
      )}

      {/* Pipeline email status (sent/replied/etc.) */}
      {contact.lastEmailStatus && (
        <div className="mt-1.5">
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${emailStatusBadge(contact.lastEmailStatus)}`}>
            {t(`email_${contact.lastEmailStatus}`)}
          </span>
        </div>
      )}

      {/* Score breakdown (collapsible) */}
      {contact.scoreBreakdown && (
        <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
          <ScoreBreakdown
            breakdown={contact.scoreBreakdown as Record<string, { score: number; maxScore: number; explanation: string }>}
            totalScore={contact.relevanceScore}
          />
        </div>
      )}
    </div>
  )
}

interface PipelineColumn {
  key: string
  statuses: string[]
  count: number
  contacts: PipelineContact[]
}

export interface PipelineBoardProps {
  columns: PipelineColumn[]
  isLoading: boolean
  dragOverCol: string | null
  onDragStart: (e: React.DragEvent, contactId: string) => void
  onDragOver: (e: React.DragEvent, colKey: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, col: PipelineColumn) => void
  onBlock: (contact: PipelineContact) => void
  onCardClick: (contactId: string) => void
}

export function PipelineBoard({
  columns,
  isLoading,
  dragOverCol,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onBlock,
  onCardClick,
}: PipelineBoardProps) {
  const t = useTranslations('pipeline')
  const tc = useTranslations('common')

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 md:px-8 pb-8 min-h-0">
      {isLoading ? (
        <p className="text-sm text-[var(--color-text-muted)] pt-4">{tc('loading')}</p>
      ) : (
        <div className="grid grid-cols-6 gap-4 h-full pt-4 min-w-[1200px] min-h-0">
          {columns.map((col) => (
            <div
              key={col.key}
              className={`flex flex-col min-w-0 min-h-0 rounded-xl border border-[var(--color-border)] border-t-4 ${COLUMN_COLORS[col.key] ?? 'border-t-gray-300'} bg-[var(--color-surface-light)] ${
                dragOverCol === col.key ? 'ring-2 ring-primary/30' : ''
              }`}
              onDragOver={(e) => onDragOver(e, col.key)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, col)}
            >
              <div className="shrink-0 px-4 py-3 border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--color-text-main)]">
                    {t(`col_${col.key}`)}
                  </h3>
                  <span className="rounded-full bg-[var(--color-border)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
                    {col.count}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {col.contacts.length === 0 ? (
                  <p className="text-xs text-center text-[var(--color-text-muted)] py-4">
                    {t('emptyColumn')}
                  </p>
                ) : (
                  col.contacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      onDragStart={onDragStart}
                      onBlock={onBlock}
                      onCardClick={onCardClick}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
