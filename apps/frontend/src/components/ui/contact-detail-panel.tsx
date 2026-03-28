'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { X, Linkedin, Github, Mail, Building2, MapPin, Globe, Pencil, Sparkles } from 'lucide-react'
import { ScoreBreakdown } from '@/components/ui/score-breakdown'
import { VisaSponsorBadge } from '@/components/ui/visa-sponsor-badge'
import { EmailEditModal } from '@/components/emails/email-edit-modal'
import { useContactDetail } from '@/hooks/use-contact-detail'
import type { EmailEntry } from '@/hooks/use-contact-detail'
import { useEmails, useEmailGeneration } from '@/hooks/use-emails'
import type { Email } from '@/hooks/use-emails'

interface ContactDetailPanelProps {
  contactId: string | null
  onClose: () => void
}

function relevanceBadgeClass(label: string): string {
  switch (label) {
    case 'very_relevant': return 'bg-green-100 text-green-700'
    case 'relevant': return 'bg-blue-100 text-blue-700'
    case 'to_review': return 'bg-yellow-100 text-yellow-700'
    case 'not_relevant': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-500'
  }
}

function emailStatusClass(status: string): string {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-600'
    case 'approved': return 'bg-blue-100 text-blue-600'
    case 'sent': return 'bg-indigo-100 text-indigo-600'
    case 'opened': return 'bg-purple-100 text-purple-600'
    case 'replied': return 'bg-green-100 text-green-600'
    case 'bounced': return 'bg-red-100 text-red-600'
    default: return 'bg-gray-100 text-gray-500'
  }
}

export function ContactDetailPanel({ contactId, onClose }: ContactDetailPanelProps) {
  const t = useTranslations('contactPanel')
  const tc = useTranslations('common')
  const { contact, thread, isLoading, error, refetch } = useContactDetail(contactId)
  const { updateEmail, regenerate } = useEmails(contactId ? { contactId } : undefined)
  const { isGenerating, generate } = useEmailGeneration()
  const closeRef = useRef<HTMLButtonElement>(null)

  const [editingEmail, setEditingEmail] = useState<Email | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const toEmail = useCallback((entry: EmailEntry): Email => ({
    id: entry.id,
    contactId: contactId ?? '',
    subject: entry.subject,
    body: entry.body,
    type: entry.type,
    status: entry.status,
    sentAt: entry.sentAt,
    scheduledAt: null,
    contact: contact ? {
      id: contact.id,
      fullName: contact.fullName,
      role: contact.role,
      email: contact.email,
      company: contact.company ? { id: contact.company.id, name: contact.company.name } : null,
    } : null,
    createdAt: entry.createdAt,
    updatedAt: entry.createdAt,
  }), [contactId, contact])

  const handleEditDraft = useCallback((entry: EmailEntry) => {
    setEditingEmail(toEmail(entry))
    setIsModalOpen(true)
  }, [toEmail])

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false)
    setEditingEmail(null)
    refetch()
  }, [refetch])

  const handleGenerateEmail = useCallback(async () => {
    if (!contactId) return
    try {
      await generate({ contactIds: [contactId] })
    } catch {
      // generate() manages its own isGenerating state
    } finally {
      refetch()
    }
  }, [contactId, generate, refetch])

  useEffect(() => {
    if (contactId) {
      closeRef.current?.focus()
    }
  }, [contactId])

  useEffect(() => {
    if (!contactId) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isModalOpen) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [contactId, onClose, isModalOpen])

  if (!contactId) return null

  const hasAiAnalysis = contact?.relevanceLabel || contact?.relevanceReason || contact?.scoreBreakdown

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={contact?.fullName ?? t('title')}
        className="relative z-50 flex h-full w-full max-w-md flex-col bg-[var(--color-surface-light)] shadow-[var(--shadow-lg)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
          <h2 className="text-base font-semibold text-[var(--color-text-main)] truncate pr-4">
            {isLoading ? tc('loading') : (contact?.fullName ?? t('title'))}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-light)] transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {isLoading && (
            <p className="text-sm text-[var(--color-text-muted)]">{tc('loading')}</p>
          )}

          {error && !isLoading && (
            <p className="text-sm text-[var(--color-error)]">{tc('genericError')}</p>
          )}

          {!isLoading && !error && contact && (
            <>
              {/* Contact info */}
              <section>
                <p className="text-sm text-[var(--color-text-muted)]">{contact.role}</p>

                {contact.company && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Building2 className="h-3.5 w-3.5 text-[var(--color-text-muted)] shrink-0" />
                      <span className="text-sm font-medium text-[var(--color-text-main)]">
                        {contact.company.name}
                      </span>
                      <VisaSponsorBadge
                        status={contact.company.visaSponsorStatus}
                        countries={contact.company.visaSponsorCountries}
                      />
                    </div>
                    {(contact.company.city || contact.company.country) && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span>
                          {[contact.company.city, contact.company.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    {contact.company.domain && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                        <Globe className="h-3 w-3 shrink-0" />
                        <span>{contact.company.domain}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 space-y-1.5">
                  {contact.email && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.linkedinUrl && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Linkedin className="h-3 w-3 shrink-0 text-[var(--color-text-muted)]" />
                      <a
                        href={contact.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-primary hover:underline"
                      >
                        {t('viewLinkedin')}
                      </a>
                    </div>
                  )}
                  {contact.githubUrl && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Github className="h-3 w-3 shrink-0 text-[var(--color-text-muted)]" />
                      <a
                        href={contact.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-primary hover:underline"
                      >
                        {t('viewGithub')}
                      </a>
                    </div>
                  )}
                </div>
              </section>

              {/* AI analysis */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                  {t('aiAnalysis')}
                </h3>

                {!hasAiAnalysis && (
                  <p className="text-xs text-[var(--color-text-muted)]">{t('notAnalyzed')}</p>
                )}

                {contact.relevanceLabel && (
                  <div className="mb-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${relevanceBadgeClass(contact.relevanceLabel)}`}>
                      {t(`relevance_${contact.relevanceLabel}`)}
                    </span>
                  </div>
                )}

                {contact.relevanceReason && (
                  <p className="text-xs text-[var(--color-text-muted)] mb-2 leading-relaxed">
                    {contact.relevanceReason}
                  </p>
                )}

                {contact.scoreBreakdown && (
                  <ScoreBreakdown
                    breakdown={contact.scoreBreakdown}
                    totalScore={contact.relevanceScore}
                  />
                )}
              </section>

              {/* Email thread */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                  {t('emailHistory')}
                </h3>

                {(!thread || (thread.emails.length === 0 && thread.replies.length === 0)) ? (
                  <div className="space-y-2">
                    <p className="text-xs text-[var(--color-text-muted)]">{t('noEmails')}</p>
                    {contact.aiRecommendation === 'contact' && (
                      <button
                        type="button"
                        onClick={() => void handleGenerateEmail()}
                        disabled={isGenerating}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        <Sparkles className="h-3 w-3" />
                        {isGenerating ? t('generating') : t('generateEmail')}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {thread.emails.map((email) => (
                      <div
                        key={email.id}
                        className="rounded-lg border border-[var(--color-border)] p-3 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium text-[var(--color-text-main)] truncate">
                            {email.subject}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {email.status === 'draft' && (
                              <button
                                type="button"
                                onClick={() => handleEditDraft(email)}
                                className="rounded p-0.5 text-[var(--color-text-muted)] hover:text-primary hover:bg-[var(--color-bg-light)] transition-colors"
                                aria-label={t('editDraft')}
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            )}
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${emailStatusClass(email.status)}`}>
                              {t(`email_${email.status}`)}
                            </span>
                          </div>
                        </div>
                        {email.sentAt && (
                          <p className="text-[var(--color-text-muted)]">
                            {new Date(email.sentAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}

                    {thread.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-light)] p-3 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium text-[var(--color-text-main)] truncate">
                            {reply.subject}
                          </span>
                          <span className="shrink-0 rounded-full bg-green-100 text-green-700 px-1.5 py-0.5 text-[10px] font-medium">
                            {t('reply')}
                          </span>
                        </div>
                        {reply.bodyText && (
                          <p className="text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
                            {reply.bodyText}
                          </p>
                        )}
                        <p className="text-[var(--color-text-muted)] mt-1">
                          {new Date(reply.receivedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Email edit modal — includes template selector from EmailEditModal (sc-549-2) */}
        <EmailEditModal
          email={editingEmail}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          updateEmail={updateEmail}
          onRegenerate={regenerate}
        />
      </div>
    </div>
  )
}
