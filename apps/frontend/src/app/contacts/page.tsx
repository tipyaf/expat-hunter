'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/contexts/auth-context'
import { CONTACT_STATUSES, useContacts, type ContactStatus } from '@/hooks/use-contacts'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

function statusColor(status: string) {
  switch (status) {
    case 'identified': return 'bg-gray-100 text-gray-700'
    case 'analyzed': return 'bg-blue-100 text-blue-700'
    case 'to_contact': return 'bg-yellow-100 text-yellow-800'
    case 'contacted': return 'bg-indigo-100 text-indigo-700'
    case 'replied': return 'bg-purple-100 text-purple-700'
    case 'interview': return 'bg-cyan-100 text-cyan-700'
    case 'offer': return 'bg-green-100 text-green-700'
    case 'rejected': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

export default function ContactsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const t = useTranslations('contacts')
  const tc = useTranslations('common')

  const [statusFilter, setStatusFilter] = useState<string>('')
  const { contacts, meta, page, isLoading, updateStatus, goToPage } = useContacts({
    status: statusFilter || undefined,
  })
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-text-muted)]">{tc('loading')}</p>
      </div>
    )
  }

  const handleStatusChange = async (contactId: string, newStatus: ContactStatus) => {
    setUpdatingId(contactId)
    try {
      await updateStatus(contactId, newStatus)
    } catch {
      // Error handled silently for now
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-primary mb-2">{t('title')}</h1>
        <p className="text-[var(--color-text-muted)] mb-6">{t('subtitle')}</p>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => setStatusFilter('')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !statusFilter
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('all')} {meta ? `(${meta.total})` : ''}
          </button>
          {CONTACT_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-white'
                  : `${statusColor(s)} hover:opacity-80`
              }`}
            >
              {t(`status_${s}`)}
            </button>
          ))}
        </div>

        {/* Contacts list */}
        {isLoading ? (
          <p className="text-sm text-[var(--color-text-muted)]">{tc('loading')}</p>
        ) : contacts.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-8 text-center">
            <p className="text-[var(--color-text-muted)]">{t('noContacts')}</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{contact.role}</h3>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${statusColor(contact.status)}`}>
                          {t(`status_${contact.status}`)}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {contact.company?.name ?? '-'}
                        {contact.company?.city && ` · ${contact.company.city}`}
                        {contact.company?.sector && ` · ${contact.company.sector}`}
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-[var(--color-text-muted)]">
                        {contact.email && <span>{contact.email}</span>}
                        {contact.linkedinUrl && (
                          <a
                            href={contact.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            LinkedIn
                          </a>
                        )}
                        <span>{t('source')}: {contact.source}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <select
                        value={contact.status}
                        onChange={(e) => void handleStatusChange(contact.id, e.target.value as ContactStatus)}
                        disabled={updatingId === contact.id}
                        className="rounded-lg border border-[var(--color-border)] bg-white px-2 py-1 text-xs disabled:opacity-50"
                      >
                        {CONTACT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {t(`status_${s}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
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
      </main>
    </div>
  )
}
