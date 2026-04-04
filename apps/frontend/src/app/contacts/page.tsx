'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { ConfidenceScore } from '@/components/ui/confidence-score'
import { ContactDetailPanel } from '@/components/ui/contact-detail-panel'
import { FakeContactRow } from '@/components/ui/fake-contact-row'
import { PremiumBadge } from '@/components/ui/premium-badge'
import { useAuth } from '@/contexts/auth-context'
import { usePlan } from '@/hooks/use-plan'
import { useAnalysis } from '@/hooks/use-analysis'
import { CONTACT_STATUSES, useContacts, type ContactStatus } from '@/hooks/use-contacts'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

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

function relevanceBadge(label: string | null) {
  switch (label) {
    case 'very_relevant': return { bg: 'bg-green-100 text-green-700 border-green-300', icon: '★', key: 'veryRelevant' }
    case 'relevant': return { bg: 'bg-blue-100 text-blue-700 border-blue-300', icon: '●', key: 'relevant' }
    case 'to_review': return { bg: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '?', key: 'toReview' }
    case 'not_relevant': return { bg: 'bg-red-100 text-red-600 border-red-300', icon: '✕', key: 'notRelevant' }
    default: return null
  }
}

const FAKE_CONTACTS_COUNT = 8

export default function ContactsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { isPremium, isFree } = usePlan()
  const t = useTranslations('contacts')
  const tc = useTranslations('common')

  const [statusFilter, setStatusFilter] = useState<string>('')
  const { contacts, meta, page, isLoading, updateStatus, goToPage, refetch } = useContacts({
    status: statusFilter || undefined,
  })
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)

  const { isAnalyzing, stats, error: analysisError, runAnalysis, fetchStats } = useAnalysis()
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null)

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

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

  const handleRunAnalysis = async () => {
    setAnalysisMessage(null)
    try {
      const result = await runAnalysis()
      setAnalysisMessage(
        t('analysisComplete', { analyzed: result.analyzed, errors: result.errors })
      )
      void refetch()
      void fetchStats()
    } catch {
      setAnalysisMessage(t('analysisError'))
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden">
        {/* Sticky header */}
        <div className="shrink-0 px-4 md:px-8 pt-8 pb-4 pl-16 md:pl-8 bg-[var(--color-bg-light)]">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-primary">{t('title')}</h1>
              <p className="text-[var(--color-text-muted)] mt-1">{t('subtitle')}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button
                onClick={() => void handleRunAnalysis()}
                disabled={isAnalyzing}
                className="shrink-0"
              >
                {isAnalyzing ? t('analyzing') : t('analyzeAll')}
              </Button>
              {stats && stats.pending > 0 && (
                <span className="text-xs text-[var(--color-text-muted)]">
                  {t('pendingAnalysis', { count: stats.pending })}
                </span>
              )}
            </div>
          </div>

          {/* Analysis feedback */}
          {analysisMessage && (
            <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${
              analysisError
                ? 'bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 text-[var(--color-error)]'
                : 'bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 text-[var(--color-success)]'
            }`}>
              {analysisMessage}
            </div>
          )}

          {/* Stats bar */}
          {stats && stats.analyzed > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {stats.byLabel.very_relevant != null && (
                <span className="inline-flex items-center gap-1 rounded-full border bg-green-100 text-green-700 border-green-300 px-2 py-0.5 text-xs font-medium">
                  ★ {t('labelVeryRelevant')} ({stats.byLabel.very_relevant})
                </span>
              )}
              {stats.byLabel.relevant != null && (
                <span className="inline-flex items-center gap-1 rounded-full border bg-blue-100 text-blue-700 border-blue-300 px-2 py-0.5 text-xs font-medium">
                  ● {t('labelRelevant')} ({stats.byLabel.relevant})
                </span>
              )}
              {stats.byLabel.to_review != null && (
                <span className="inline-flex items-center gap-1 rounded-full border bg-yellow-100 text-yellow-800 border-yellow-300 px-2 py-0.5 text-xs font-medium">
                  ? {t('labelToReview')} ({stats.byLabel.to_review})
                </span>
              )}
              {stats.byLabel.not_relevant != null && (
                <span className="inline-flex items-center gap-1 rounded-full border bg-red-100 text-red-600 border-red-300 px-2 py-0.5 text-xs font-medium">
                  ✕ {t('labelNotRelevant')} ({stats.byLabel.not_relevant})
                </span>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
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
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8">
          {(() => {
            if (isLoading) {
              return <p className="text-sm text-[var(--color-text-muted)]">{tc('loading')}</p>
            }
            if (contacts.length === 0) {
              return (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-8 text-center">
                  <p className="text-[var(--color-text-muted)]">{t('noContacts')}</p>
                </div>
              )
            }
            return (
            <>
              <div className="space-y-3">
                {contacts.map((contact) => {
                  const badge = isPremium ? relevanceBadge(contact.relevanceLabel) : null
                  return (
                    <div
                      key={contact.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedContactId(contact.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedContactId(contact.id) } }}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 shadow-sm cursor-pointer hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{contact.fullName}</h3>
                            {contact.confidenceScore != null && (
                              <ConfidenceScore
                                score={contact.confidenceScore}
                                factors={contact.confidenceFactors ?? undefined}
                              />
                            )}
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${statusColor(contact.status)}`}>
                              {t(`status_${contact.status}`)}
                            </span>
                            {badge && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${badge.bg}`}
                                title={contact.relevanceReason ?? ''}
                              >
                                {badge.icon} {contact.relevanceScore}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-[var(--color-text-main)]">
                            {contact.role}
                          </p>
                          <p className="text-sm text-[var(--color-text-muted)]">
                            {contact.company?.name ?? '-'}
                            {contact.company?.city && ` · ${contact.company.city}`}
                            {contact.company?.sector && ` · ${contact.company.sector}`}
                          </p>
                          {contact.relevanceReason && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-1 italic">
                              {contact.relevanceReason}
                            </p>
                          )}
                          <div className="flex gap-4 mt-2 text-xs text-[var(--color-text-muted)]">
                            {contact.email && <span>{contact.email}</span>}
                            {contact.linkedinUrl && (
                              <a
                                href={contact.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                LinkedIn
                              </a>
                            )}
                            {user?.isAdmin && <span>{t('source')}: {contact.source}</span>}
                            {contact.aiRecommendation && (() => {
                              const recColor =
                                contact.aiRecommendation === 'contact'
                                  ? 'text-green-600'
                                  : contact.aiRecommendation === 'skip'
                                    ? 'text-red-500'
                                    : 'text-yellow-600'
                              return (
                                <span className={`font-medium ${recColor}`}>
                                  {t(`rec_${contact.aiRecommendation}`)}
                                </span>
                              )
                            })()}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <select
                            value={contact.status}
                            onChange={(e) => void handleStatusChange(contact.id, e.target.value as ContactStatus)}
                            onClick={(e) => e.stopPropagation()}
                            disabled={updatingId === contact.id}
                            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-light)] text-[var(--color-text-main)] px-2 py-1 text-xs disabled:opacity-50"
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
                  )
                })}
              </div>

              {/* Fake blurred contacts for free users */}
              {isFree && user && (
                <div className="mt-4 space-y-3 relative">
                  {Array.from({ length: FAKE_CONTACTS_COUNT }, (_, i) => (
                    <div
                      key={`fake-${i}`}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 shadow-sm pointer-events-none select-none opacity-50"
                    >
                      <FakeContactRow index={i} userId={user.id} />
                    </div>
                  ))}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 bg-[var(--color-surface-light)]/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                      <PremiumBadge size="md" />
                      <p className="text-sm text-[var(--color-text-muted)] text-center max-w-xs">
                        {t('fakeContactsHint')}
                      </p>
                      <a
                        href="/upgrade"
                        className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-shadow"
                      >
                        {t('upgradeCta')}
                      </a>
                    </div>
                  </div>
                </div>
              )}

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
            )
          })()}
        </div>
      </main>
      <ContactDetailPanel
        contactId={selectedContactId}
        onClose={() => setSelectedContactId(null)}
      />
    </div>
  )
}
