'use client'

import type { Email } from '@/hooks/use-emails'
import { useTranslations } from 'next-intl'
import { CheckSquare, Square } from 'lucide-react'

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

export interface EmailListProps {
  emails: Email[]
  selected: Set<string>
  actionId: string | null
  meta: { total: number; lastPage: number } | null
  page: number
  isLoading: boolean
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onEdit: (email: Email) => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onGoToPage: (page: number) => void
}

export function EmailList({
  emails,
  selected,
  actionId,
  meta,
  page,
  isLoading,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onEdit,
  onApprove,
  onReject,
  onGoToPage,
}: EmailListProps) {
  const t = useTranslations('emails')
  const tc = useTranslations('common')

  if (isLoading) {
    return <p className="text-sm text-[var(--color-text-muted)] pt-4">{tc('loading')}</p>
  }

  if (emails.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-8 text-center mt-4">
        <p className="text-[var(--color-text-muted)]">{t('noEmails')}</p>
      </div>
    )
  }

  return (
    <>
      {/* Select all row */}
      <div className="flex items-center gap-3 pt-4 pb-2">
        <button
          type="button"
          onClick={selected.size > 0 ? onClearSelection : onSelectAll}
          className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
        >
          {selected.size > 0
            ? <CheckSquare className="w-4 h-4 text-primary" />
            : <Square className="w-4 h-4" />
          }
          {selected.size > 0
            ? t('clearSelection', { count: selected.size })
            : t('selectAllApproved')}
        </button>
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
                  onClick={() => onToggleSelect(email.id)}
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
                          onClick={() => onEdit(email)}
                          className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-bg-light)]"
                        >
                          {t('edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onApprove(email.id)}
                          disabled={actionId === email.id}
                          className="rounded-lg bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {t('approve')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onReject(email.id)}
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
            onClick={() => onGoToPage(page - 1)}
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
            onClick={() => onGoToPage(page + 1)}
            disabled={page >= meta.lastPage}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-sm disabled:opacity-30"
          >
            {tc('next')}
          </button>
        </div>
      )}
    </>
  )
}
