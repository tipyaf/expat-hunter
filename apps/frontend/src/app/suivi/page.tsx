'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { ContactDetailPanel } from '@/components/ui/contact-detail-panel'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useAuth } from '@/contexts/auth-context'
import { PremiumGate } from '@/components/ui/premium-gate'
import { usePlan } from '@/hooks/use-plan'
import { usePipeline } from '@/hooks/use-pipeline'
import type { PipelineContact } from '@/hooks/use-pipeline'
import { apiClient } from '@/lib/api-client'
import { useTranslations } from 'next-intl'
import { useRef, useState, useCallback } from 'react'
import { PipelineBoard } from './pipeline-board'
import { PipelineStats } from './pipeline-stats'

const COLUMN_COLORS: Record<string, string> = {
  found: 'border-t-gray-400',
  to_contact: 'border-t-blue-500',
  contacted: 'border-t-indigo-500',
  in_discussion: 'border-t-purple-500',
  interview: 'border-t-yellow-500',
  done: 'border-t-green-500',
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
    } catch (error) {
      console.error('Failed to fetch contextual tip:', error)
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
    } catch (error) {
      console.error('Failed to block contact:', error)
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
        <>
        <PipelineStats total={total} stats={stats} tip={tip} />

        <PipelineBoard
          columns={columns}
          isLoading={isLoading}
          dragOverCol={dragOverCol}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onBlock={setBlockTarget}
          onCardClick={setSelectedContactId}
        />
        </>
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
