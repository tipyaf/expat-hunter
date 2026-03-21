'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/contexts/auth-context'
import { usePipeline } from '@/hooks/use-pipeline'
import type { PipelineContact } from '@/hooks/use-pipeline'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

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
  done: 'border-t-green-500',
}

function ContactCard({
  contact,
  t,
  onDragStart,
}: {
  contact: PipelineContact
  t: (key: string) => string
  onDragStart: (e: React.DragEvent, contactId: string) => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, contact.id)}
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-light)] p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-medium text-[var(--color-text-main)] truncate">
          {contact.fullName}
        </p>
        {contact.relevanceLabel && (
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${relevanceBadge(contact.relevanceLabel)}`}>
            {t(`relevance_${contact.relevanceLabel}`)}
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--color-text-muted)] truncate">{contact.role}</p>
      {contact.company && (
        <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
          {contact.company.name}
          {contact.company.country && ` · ${contact.company.country}`}
        </p>
      )}
      <div className="flex items-center gap-2 mt-2">
        {contact.email && (
          <span className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[120px]">
            {contact.email}
          </span>
        )}
        {contact.lastEmailStatus && (
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${emailStatusBadge(contact.lastEmailStatus)}`}>
            {t(`email_${contact.lastEmailStatus}`)}
          </span>
        )}
      </div>
    </div>
  )
}

export default function PipelinePage() {
  const { user, isLoading: authLoading } = useAuth()
  const t = useTranslations('pipeline')
  const tc = useTranslations('common')
  const { columns, stats, total, isLoading, moveContact } = usePipeline()
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const dragContactId = useRef<string | null>(null)

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-text-muted)]">{tc('loading')}</p>
      </div>
    )
  }

  const handleDragStart = (_e: React.DragEvent, contactId: string) => {
    dragContactId.current = contactId
  }

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault()
    setDragOverCol(colKey)
  }

  const handleDragLeave = () => {
    setDragOverCol(null)
  }

  const handleDrop = (e: React.DragEvent, col: { key: string; statuses: string[] }) => {
    e.preventDefault()
    setDragOverCol(null)
    const contactId = dragContactId.current
    if (!contactId) return
    dragContactId.current = null

    const targetStatus = col.statuses[0]
    const contact = columns.flatMap((c) => c.contacts).find((c) => c.id === contactId)
    if (!contact || col.statuses.includes(contact.status)) return

    void moveContact(contactId, targetStatus)
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 md:px-8 pt-8 pb-4 pl-16 md:pl-8 bg-[var(--color-bg-light)]">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-primary">{t('title')}</h1>
              <p className="text-[var(--color-text-muted)] mt-1">{t('subtitle')}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--color-text-muted)]">
                {t('totalContacts', { count: total })}
              </span>
            </div>
          </div>

          {stats && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats).map(([status, count]) => (
                <span
                  key={status}
                  className="rounded-full bg-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)]"
                >
                  {t(`stat_${status}`)}: {count}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 md:px-8 pb-8">
          {isLoading ? (
            <p className="text-sm text-[var(--color-text-muted)] pt-4">{tc('loading')}</p>
          ) : (
            <div className="flex gap-4 h-full pt-4">
              {columns.map((col) => (
                <div
                  key={col.key}
                  className={`flex flex-col w-72 shrink-0 rounded-xl border border-[var(--color-border)] border-t-4 ${COLUMN_COLORS[col.key] ?? 'border-t-gray-300'} bg-[var(--color-surface-light)] ${
                    dragOverCol === col.key ? 'ring-2 ring-primary/30' : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col)}
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
                          t={t}
                          onDragStart={handleDragStart}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
