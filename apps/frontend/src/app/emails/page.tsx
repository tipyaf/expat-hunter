'use client'

import { EmailEditModal } from '@/components/emails/email-edit-modal'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useAuth } from '@/contexts/auth-context'
import { EMAIL_STATUSES, useEmailGeneration, useEmails, type Email } from '@/hooks/use-emails'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { Send, X } from 'lucide-react'
import { EmailList } from './email-list'
import { EmailSendProgress, type SendProgress } from './email-send-progress'

function statusColor(status: string) {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-700'
    case 'approved': return 'bg-blue-100 text-blue-700'
    case 'sent': return 'bg-indigo-100 text-indigo-700'
    case 'opened': return 'bg-purple-100 text-purple-700'
    case 'replied': return 'bg-green-100 text-green-700'
    case 'bounced': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

export default function EmailsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const t = useTranslations('emails')
  const tc = useTranslations('common')

  const [statusFilter, setStatusFilter] = useState<string>('')
  const {
    emails, meta, page, isLoading,
    approve, reject, updateEmail, regenerate, approveBatch, sendBatch, getSendBatchProgress,
    goToPage, refetch,
  } = useEmails({ status: statusFilter || undefined })
  const { isGenerating, generate } = useEmailGeneration()

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [editingEmail, setEditingEmail] = useState<Email | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)

  // Batch selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showSendConfirm, setShowSendConfirm] = useState(false)
  const [sendProgress, setSendProgress] = useState<SendProgress | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clear selection when filter changes
  useEffect(() => { setSelected(new Set()) }, [statusFilter])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    const approvable = emails.filter((e) => e.status === 'approved').map((e) => e.id)
    setSelected(new Set(approvable))
  }

  const clearSelection = () => setSelected(new Set())

  const handleGenerate = async () => {
    setMessage(null)
    try {
      const result = await generate()
      if (result.generated === 0 && result.errors === 0) {
        setMessage({ text: t('noContactsToGenerate'), type: 'error' })
      } else {
        setMessage({ text: t('generateComplete', { generated: result.generated, errors: result.errors }), type: result.errors > 0 ? 'error' : 'success' })
      }
      void refetch()
    } catch (error) {
      console.error('Failed to generate emails:', error)
      setMessage({ text: t('generateError'), type: 'error' })
    }
  }

  const handleApprove = async (id: string) => {
    setActionId(id)
    try { await approve(id) } finally { setActionId(null) }
  }

  const handleReject = async (id: string) => {
    setActionId(id)
    try { await reject(id) } finally { setActionId(null) }
  }

  const handleApproveAllDrafts = async () => {
    const draftIds = emails.filter((e) => e.status === 'draft').map((e) => e.id)
    if (draftIds.length === 0) return
    await approveBatch(draftIds)
  }

  const handleApproveSelected = async () => {
    const ids = [...selected].filter((id) => emails.find((e) => e.id === id && e.status === 'draft'))
    if (ids.length === 0) return
    await approveBatch(ids)
    clearSelection()
  }

  const startProgressPolling = (batchId: string) => {
    pollRef.current = setInterval(async () => {
      const p = await getSendBatchProgress(batchId)
      if (!p) return
      setSendProgress({ batchId: p.batchId, status: p.status, total: p.total, sent: p.sent, failed: p.failed })
      if (p.status !== 'completed' && p.status !== 'failed') return
      clearInterval(pollRef.current!)
      pollRef.current = null
      setMessage({
        text: t('sendComplete', { sent: p.sent, failed: p.failed }),
        type: p.failed > 0 ? 'error' : 'success',
      })
      void refetch()
    }, 1500)
  }

  const handleSendConfirmed = async () => {
    setShowSendConfirm(false)
    setMessage(null)
    try {
      const emailIds = selected.size > 0 ? [...selected] : undefined
      const result = await sendBatch(emailIds)
      setSendProgress({
        batchId: result.batchId,
        status: 'running',
        total: result.total,
        sent: 0,
        failed: 0,
      })
      clearSelection()
      startProgressPolling(result.batchId)
    } catch {
      setMessage({ text: t('sendError'), type: 'error' })
    }
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const draftCount = emails.filter((e) => e.status === 'draft').length
  const approvedCount = emails.filter((e) => e.status === 'approved').length
  const selectedApproved = [...selected].filter((id) => emails.find((e) => e.id === id && e.status === 'approved'))

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-text-muted)]">{tc('loading')}</p>
      </div>
    )
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
            <div className="flex gap-2 flex-wrap justify-end">
              {draftCount > 1 && (
                <Button variant="secondary" onClick={() => void handleApproveAllDrafts()}>
                  {t('approveAll')} ({draftCount})
                </Button>
              )}
              {approvedCount > 0 && selected.size === 0 && (
                <Button variant="secondary" onClick={() => setShowSendConfirm(true)}>
                  <Send className="w-4 h-4 mr-1.5" />
                  {t('sendAll')} ({approvedCount})
                </Button>
              )}
              <Button onClick={() => void handleGenerate()} disabled={isGenerating}>
                {isGenerating ? t('generating') : t('generateEmails')}
              </Button>
            </div>
          </div>

          {/* Messages */}
          {message && (
            <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${
              message.type === 'error'
                ? 'bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 text-[var(--color-error)]'
                : 'bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 text-[var(--color-success)]'
            }`}>
              {message.text}
            </div>
          )}

          {/* Send progress */}
          <EmailSendProgress sendProgress={sendProgress} />

          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                !statusFilter ? 'bg-primary text-white' : 'bg-[var(--color-border)] text-[var(--color-text-muted)] hover:opacity-80'
              }`}
            >
              {t('all')} {meta ? `(${meta.total})` : ''}
            </button>
            {EMAIL_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s ? 'bg-primary text-white' : `${statusColor(s)} hover:opacity-80`
                }`}
              >
                {t(`status_${s}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-24">
          <EmailList
            emails={emails}
            selected={selected}
            actionId={actionId}
            meta={meta}
            page={page}
            isLoading={isLoading}
            onToggleSelect={toggleSelect}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onEdit={setEditingEmail}
            onApprove={(id) => void handleApprove(id)}
            onReject={(id) => void handleReject(id)}
            onGoToPage={(p) => void goToPage(p)}
          />
        </div>

        {/* Batch actions bar */}
        {selected.size > 0 && (
          <div className="fixed bottom-0 inset-x-0 md:left-64 z-40 p-4">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-4 rounded-2xl bg-[var(--color-text-main)] text-[var(--color-surface-light)] px-5 py-3 shadow-xl">
              <span className="text-sm font-medium">
                {t('selectedCount', { count: selected.size })}
              </span>
              <div className="flex items-center gap-2">
                {emails.some((e) => selected.has(e.id) && e.status === 'draft') && (
                  <button
                    type="button"
                    onClick={() => void handleApproveSelected()}
                    className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium hover:bg-blue-600 transition-colors"
                  >
                    {t('approveSelected')}
                  </button>
                )}
                {selectedApproved.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSendConfirm(true)}
                    className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium hover:bg-green-600 transition-colors flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {t('sendSelected', { count: selectedApproved.length })}
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded-lg border border-white/20 px-2 py-1.5 hover:bg-white/10 transition-colors"
                  aria-label={tc('cancel')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Email edit modal */}
        <EmailEditModal
          email={editingEmail}
          isOpen={editingEmail !== null}
          onClose={() => setEditingEmail(null)}
          updateEmail={async (emailId, data) => {
            const updated = await updateEmail(emailId, data)
            return updated
          }}
          onRegenerate={regenerate}
        />

        {/* Send confirmation modal */}
        <ConfirmModal
          open={showSendConfirm}
          title={t('confirmSendTitle')}
          message={t('confirmSendMessage', {
            count: selected.size > 0 ? selectedApproved.length : approvedCount,
          })}
          confirmLabel={t('confirmSend')}
          cancelLabel={tc('cancel')}
          onConfirm={() => void handleSendConfirmed()}
          onCancel={() => setShowSendConfirm(false)}
        />
      </main>
    </div>
  )
}
