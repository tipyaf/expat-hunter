'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { EMAIL_STATUSES, useEmailGeneration, useEmails } from '@/hooks/use-emails'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

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
  const { emails, meta, page, isLoading, approve, reject, updateEmail, regenerate, approveBatch, goToPage, refetch } = useEmails({
    status: statusFilter || undefined,
  })
  const { isGenerating, generate } = useEmailGeneration()

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-text-muted)]">{tc('loading')}</p>
      </div>
    )
  }

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

  const handleRegenerate = async (id: string) => {
    setActionId(id)
    try { await regenerate(id) } finally { setActionId(null) }
  }

  const handleApproveAll = async () => {
    const draftIds = emails.filter((e) => e.status === 'draft').map((e) => e.id)
    if (draftIds.length === 0) return
    await approveBatch(draftIds)
  }

  const startEditing = (email: { id: string; subject: string; body: string }) => {
    setEditingId(email.id)
    setEditSubject(email.subject)
    setEditBody(email.body)
  }

  const draftCount = emails.filter((e) => e.status === 'draft').length

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-8 pt-8 pb-4 bg-[var(--color-bg-light)]">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-primary">{t('title')}</h1>
              <p className="text-[var(--color-text-muted)] mt-1">{t('subtitle')}</p>
            </div>
            <div className="flex gap-2">
              {draftCount > 1 && (
                <Button variant="secondary" onClick={() => void handleApproveAll()}>
                  {t('approveAll')} ({draftCount})
                </Button>
              )}
              <Button onClick={() => void handleGenerate()} disabled={isGenerating}>
                {isGenerating ? t('generating') : t('generateEmails')}
              </Button>
            </div>
          </div>

          {message && (
            <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${
              message.type === 'error'
                ? 'bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 text-[var(--color-error)]'
                : 'bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 text-[var(--color-success)]'
            }`}>
              {message.text}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                !statusFilter ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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

        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {isLoading ? (
            <p className="text-sm text-[var(--color-text-muted)]">{tc('loading')}</p>
          ) : emails.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-8 text-center">
              <p className="text-[var(--color-text-muted)]">{t('noEmails')}</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-5 shadow-sm"
                  >
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
                            onClick={() => void handleRegenerate(email.id)}
                            disabled={actionId === email.id}
                            className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                            title={t('regenerate')}
                          >
                            {t('regenerate')}
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditing(email)}
                            className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-gray-50"
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

                    {editingId === email.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium"
                        />
                        <textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          rows={6}
                          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={async () => {
                              await updateEmail(email.id, { subject: editSubject, body: editBody })
                              setEditingId(null)
                            }}
                          >
                            {tc('save')}
                          </Button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-xs"
                          >
                            {tc('cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-medium mb-2">{email.subject}</h3>
                        <p className="text-sm text-[var(--color-text-muted)] whitespace-pre-wrap">
                          {email.body}
                        </p>
                      </>
                    )}
                  </div>
                ))}
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
      </main>
    </div>
  )
}
