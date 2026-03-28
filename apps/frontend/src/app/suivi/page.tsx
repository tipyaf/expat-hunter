'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { ContactDetailPanel } from '@/components/ui/contact-detail-panel'
import { ContactSourceBadge } from '@/components/ui/contact-source-badge'
import { EmailStatusBadge } from '@/components/ui/email-status-badge'
import { ScoreBreakdown } from '@/components/ui/score-breakdown'
import { VisaSponsorBadge } from '@/components/ui/visa-sponsor-badge'
import { ProactiveTip } from '@/components/ui/proactive-tip'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useAuth } from '@/contexts/auth-context'
import { PremiumGate } from '@/components/ui/premium-gate'
import { usePlan } from '@/hooks/use-plan'
import { usePipeline } from '@/hooks/use-pipeline'
import type { PipelineContact } from '@/hooks/use-pipeline'
import { apiClient } from '@/lib/api-client'
import { useTranslations } from 'next-intl'
import { useRef, useState, useCallback } from 'react'
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
  t,
  onDragStart,
  onBlock,
  onCardClick,
}: {
  contact: PipelineContact
  t: (key: string) => string
  onDragStart: (e: React.DragEvent, contactId: string) => void
  onBlock: (contact: PipelineContact) => void
  onCardClick: (contactId: string) => void
}) {
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

interface BlockTarget {
  contact: PipelineContact
  scope: 'contact' | 'company'
  durationDays: number | null
  reason: string
}

export default function PipelinePage() {
  const { user, isLoading: authLoading, token } = useAuth()
  const t = useTranslations('pipeline')
  const tc = useTranslations('common')
  const { columns, stats, total, isLoading, moveContact, refresh } = usePipeline()
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const dragContactId = useRef<string | null>(null)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [blockTarget, setBlockTarget] = useState<PipelineContact | null>(null)
  const [blockForm, setBlockForm] = useState<{ scope: 'contact' | 'company'; durationDays: string; reason: string }>({
    scope: 'contact',
    durationDays: '90',
    reason: '',
  })
  const [blocking, setBlocking] = useState(false)

  // Contextual tip for kanban
  const [tip, setTip] = useState<{ message: string; cta?: { label: string; href: string } } | null>(null)
  const tipFetchedForCol = useRef<string | null>(null)
  const fetchTip = useCallback(async (colKey: string) => {
    if (!token || tipFetchedForCol.current === colKey) return
    tipFetchedForCol.current = colKey
    try {
      const res = await apiClient.get<{ data: { message: string; cta?: { label: string; href: string } } }>(
        `/api/tips/contextual?page=kanban&status=${colKey}`,
        { token }
      )
      setTip(res.data)
    } catch {
      // silently fail
    }
  }, [token])

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
    void fetchTip(colKey)
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

    void moveContact(contactId, targetStatus, 'drag_drop')
  }

  const handleBlock = async () => {
    if (!token || !blockTarget) return
    setBlocking(true)
    try {
      await apiClient.post('/api/blocked', {
        entityType: blockForm.scope,
        entityId: blockForm.scope === 'company' ? (blockTarget.company?.id ?? blockTarget.id) : blockTarget.id,
        reason: blockForm.reason || null,
        durationDays: blockForm.durationDays ? Number(blockForm.durationDays) : null,
      }, { token })
      setBlockTarget(null)
      refresh()
    } catch {
      // silently fail
    } finally {
      setBlocking(false)
    }
  }

  const { isFree } = usePlan()

  const kanbanMockup = (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-8 pt-8 pb-4 pl-16 md:pl-8 bg-[var(--color-bg-light)]">
        <h1 className="text-3xl font-bold text-primary">{t('title')}</h1>
        <p className="text-[var(--color-text-muted)] mt-1">{t('subtitle')}</p>
      </div>
      <div className="flex-1 overflow-x-auto px-4 md:px-8 pb-8">
        <div className="flex gap-4 h-full min-w-max">
          {Object.entries(COLUMN_COLORS).map(([key, color]) => (
            <div key={key} className={`w-72 flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] border-t-4 ${color}`}>
              <div className="p-3 border-b border-[var(--color-border)]">
                <h3 className="font-medium text-sm capitalize">{key.replace('_', ' ')}</h3>
                <span className="text-xs text-[var(--color-text-muted)]">0</span>
              </div>
              <div className="flex-1 p-3 space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 opacity-30">
                    <div className="h-3 w-24 bg-[var(--color-border)] rounded mb-2" />
                    <div className="h-2 w-32 bg-[var(--color-border)] rounded mb-1" />
                    <div className="h-2 w-20 bg-[var(--color-border)] rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden">
        {isFree ? (
          <PremiumGate>{kanbanMockup}</PremiumGate>
        ) : (
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

        {/* Contextual ProactiveTip */}
        {tip && (
          <div className="px-4 md:px-8 py-2">
            <ProactiveTip message={tip.message} cta={tip.cta} />
          </div>
        )}

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
                          onBlock={setBlockTarget}
                          onCardClick={setSelectedContactId}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </main>

      {/* Contact detail panel */}
      <ContactDetailPanel
        contactId={selectedContactId}
        onClose={() => setSelectedContactId(null)}
      />

      {/* Block modal */}
      {blockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-[var(--color-surface-light)] p-6 shadow-xl">
            <h2 className="text-base font-semibold text-[var(--color-text-main)] mb-4">{t('blockTitle')}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">{t('blockScope')}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBlockForm((f) => ({ ...f, scope: 'contact' }))}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      blockForm.scope === 'contact'
                        ? 'bg-primary text-white'
                        : 'border border-[var(--color-border)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {t('blockContact')}
                  </button>
                  {blockTarget.company && (
                    <button
                      type="button"
                      onClick={() => setBlockForm((f) => ({ ...f, scope: 'company' }))}
                      className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        blockForm.scope === 'company'
                          ? 'bg-primary text-white'
                          : 'border border-[var(--color-border)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {t('blockCompany')}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">{t('blockDuration')}</label>
                <select
                  value={blockForm.durationDays}
                  onChange={(e) => setBlockForm((f) => ({ ...f, durationDays: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-1.5 text-sm"
                >
                  <option value="30">{t('block30days')}</option>
                  <option value="90">{t('block90days')}</option>
                  <option value="180">{t('block180days')}</option>
                  <option value="">{t('blockPermanent')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">{t('blockReason')}</label>
                <input
                  type="text"
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder={t('blockReasonPlaceholder')}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => void handleBlock()}
                disabled={blocking}
                className="flex-1 rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {blocking ? tc('saving') : t('blockConfirm')}
              </button>
              <button
                type="button"
                onClick={() => setBlockTarget(null)}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)]"
              >
                {tc('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
