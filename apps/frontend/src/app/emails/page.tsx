'use client'

import { EmailEditModal } from '@/components/emails/email-edit-modal'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useAuth } from '@/contexts/auth-context'
import { EMAIL_STATUSES, useEmailGeneration, useEmails, type Email } from '@/hooks/use-emails'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { CheckSquare, Send, Square, X } from 'lucide-react'

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

interface SendProgress {
  batchId: string
  status: 'running' | 'completed' | 'failed'
  total: number
  sent: number
  failed: number
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
    } catch {
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
          {sendProgress && sendProgress.status === 'running' && (
            <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-light)] px-4 py-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[var(--color-text-main)] font-medium">{t('sending')}</span>
                <span className="text-[var(--color-text-muted)]">{sendProgress.sent}/{sendProgress.total}</span>
              </div>
              <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${sendProgress.total > 0 ? Math.round((sendProgress.sent / sendProgress.total) * 100) : 0}%` }}
                />
              </div>
            </div>
          )}

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
          {isLoading ? (
            <p className="text-sm text-[var(--color-text-muted)] pt-4">{tc('loading')}</p>
          ) : emails.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-8 text-center mt-4">
              <p className="text-[var(--color-text-muted)]">{t('noEmails')}</p>
            </div>
          ) : (
            <>
              {/* Select all row */}
              <div className="flex items-center gap-3 pt-4 pb-2">
                {(() => {
                  const hasSelection = selected.size > 0
                  const icon = hasSelection
                    ? <CheckSquare className="w-4 h-4 text-primary" />
                    : <Square className="w-4 h-4" />
                  const label = hasSelection
                    ? t('clearSelection', { count: selected.size })
                    : t('selectAllApproved')
                  return (
                    <button
                      type="button"
                      onClick={hasSelection ? clearSelection : selectAll}
                      className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
                    >
                      {icon}
                      {label}
                    </button>
                  )
                })()}
              </div>

              <div className="space-y-3">
                {emails.map((email) => {
                  const isSelected = selected.has(email.id)
                  const isApproved = email.status === 'approved'

                  return (
                    <div
                      key={email.id}
                      className={`rounded-xl border bg-[var(--color-surface-light)] p-5 shadow-sm transition-colors ${
                        isSelected ? 'border-primary/50 ring-1 ring-primary/20' : 'border-[var(--color-border)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleSelect(email.id)}
                          disabled={!isApproved}
                          className={`mt-0.5 shrink-0 transition-colors ${isApproved ? 'cursor-pointer' : 'opacity-30 cursor-not-allowed'}`}
                          aria-label={isSelected ? t('deselect') : t('select')}
                        >
                          {isSelected
                            ? <CheckSquare className="w-5 h-5 text-primary" />
                            : <Square className="w-5 h-5 text-[var(--color-text-muted)]" />
                          }
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${statusColor(email.status)}`}>
                                  {t(`status_${email.status}`)}
                                </span>
                                <span className="text-xs text-[var(--color-text-muted)]">{email.type}</span>
                              </div>
                              {email.contact && (
                                <p className="text-sm text-[var(--color-text-muted)]">
                                  {t('to')}: <span className="font-medium text-[var(--color-text-main)]">{email.contact.fullName}</span>
                                  {email.contact.role && ` — ${email.contact.role}`}
                                  {email.contact.company && ` @ ${email.contact.company.name}`}
                                  {email.contact.email && (
                                    <span className="ml-2 text-xs">({email.contact.email})</span>
                                  )}
                                </p>
                              )}
                            </div>
                            {email.status === 'draft' && (
                              <div className="flex gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setEditingEmail(email)}
                                  className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-bg-light)]"
                                >
                                  {t('edit')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleApprove(email.id)}
                                  disabled={actionId === email.id}
                                  className="rounded-lg bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                  {t('approve')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleReject(email.id)}
                                  disabled={actionId === email.id}
                                  className="rounded-lg bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600 disabled:opacity-50"
                                >
                                  {t('reject')}
                                </button>
                              </div>
                            )}
                          </div>

                          <h3 className="font-medium text-[var(--color-text-main)] mb-2">{email.subject}</h3>
                          <p className="text-sm text-[var(--color-text-muted)] whitespace-pre-wrap line-clamp-4">
                            {email.body}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {meta && meta.lastPage > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => void goToPage(page - 1)}
                    disabled={page <= 1}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-sm disabled:opacity-30"
                  >
                    {tc('previous')}
                  </button>
                  <span className="flex items-center text-sm text-[var(--color-text-muted)]">
                    {page} / {meta.lastPage}
                  </span>
                  <button
                    type="button"
                    onClick={() => void goToPage(page + 1)}
                    disabled={page >= meta.lastPage}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-sm disabled:opacity-30"
                  >
                    {tc('next')}
                  </button>
                </div>
              )}
            </>
          )}
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
