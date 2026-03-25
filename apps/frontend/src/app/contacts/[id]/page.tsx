'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { ThreadView } from '@/components/thread/thread-view'
import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { use } from 'react'

interface ContactDetail {
  id: string
  fullName: string
  role: string
  email: string | null
  status: string
  company: {
    name: string
    country: string
    city: string | null
    sector: string | null
  } | null
}

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, token, isLoading: authLoading } = useAuth()
  const t = useTranslations('contacts')
  const tc = useTranslations('common')
  const tThread = useTranslations('thread')

  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'thread'>('thread')

  useEffect(() => {
    if (!token) return
    setIsLoading(true)
    apiClient
      .get<{ data: ContactDetail }>(`/api/contacts/${id}`, { token })
      .then((res) => setContact(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [token, id])

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-text-muted)]">{tc('loading')}</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 md:px-8 pt-8 pb-4 pl-16 md:pl-8 bg-[var(--color-bg-light)]">
          {contact ? (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-primary">{contact.fullName}</h1>
                  <p className="text-[var(--color-text-muted)]">
                    {contact.role}
                    {contact.company ? ` · ${contact.company.name}` : ''}
                    {contact.company?.city ? ` · ${contact.company.city}` : ''}
                  </p>
                  {contact.email && (
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">{contact.email}</p>
                  )}
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700">
                  {t(`status_${contact.status}`)}
                </span>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'info'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  Informations
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('thread')}
                  className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'thread'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  {tThread('title')}
                </button>
              </div>
            </>
          ) : (
            <p className="text-[var(--color-text-muted)]">Contact introuvable</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 pl-16 md:pl-8">
          {contact && activeTab === 'info' && (
            <div className="max-w-2xl pt-6 space-y-4">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4">
                <h2 className="text-sm font-semibold mb-3">Informations du contact</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <span className="text-[var(--color-text-muted)] w-28 shrink-0">Email</span>
                    <span>{contact.email ?? '-'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[var(--color-text-muted)] w-28 shrink-0">Entreprise</span>
                    <span>{contact.company?.name ?? '-'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[var(--color-text-muted)] w-28 shrink-0">Secteur</span>
                    <span>{contact.company?.sector ?? '-'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[var(--color-text-muted)] w-28 shrink-0">Pays</span>
                    <span>{contact.company?.country ?? '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {contact && activeTab === 'thread' && (
            <div className="max-w-2xl pt-6">
              <ThreadView contactId={contact.id} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
