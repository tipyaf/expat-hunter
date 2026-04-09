'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useJobApplicationSend } from '@/hooks/use-job-application-send'
import { useRecruitmentContacts } from '@/hooks/use-recruitment-contacts'
import { Send, Paperclip, CheckCircle, AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ApplicationEmailStatus } from '@/lib/job-application-send-api'

interface SendTabProps {
  readonly offerId: string
  readonly token: string
  readonly contactEmail?: string | null
}

const MANUAL_INPUT_VALUE = '__manual__'

/* ── Attachment indicators (shared between sent + draft views) ── */
function AttachmentsList(): ReactNode {
  return (
    <div data-testid="email-attachments-list" className="flex gap-3">
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-2">
        <Paperclip size={14} className="text-[var(--color-text-muted)]" aria-hidden="true" />
        <span className="text-sm text-[var(--color-text-main)]">CV.pdf</span>
        <CheckCircle size={14} className="text-[var(--color-success)]" aria-hidden="true" />
      </div>
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-2">
        <Paperclip size={14} className="text-[var(--color-text-muted)]" aria-hidden="true" />
        <span className="text-sm text-[var(--color-text-main)]">CoverLetter.pdf</span>
        <CheckCircle size={14} className="text-[var(--color-success)]" aria-hidden="true" />
      </div>
    </div>
  )
}

/* ── Sent state view ── */
function SentView({ emailStatus, t }: { readonly emailStatus: ApplicationEmailStatus; readonly t: ReturnType<typeof useTranslations<'sendTab'>> }): ReactNode {
  const sentDate = emailStatus.sentAt
    ? new Date(emailStatus.sentAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div data-testid="send-tab" className="space-y-4">
      <div
        data-testid="send-tab-sent-badge"
        className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-4"
      >
        <CheckCircle size={20} className="text-[var(--color-success)]" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-[var(--color-success)]">
            {sentDate
              ? t('sentOn', { date: sentDate, email: emailStatus.sentToEmail ?? '' })
              : t('applicationSent')}
          </p>
        </div>
      </div>

      {emailStatus.emailText && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4">
          <h3 className="mb-2 text-sm font-medium text-[var(--color-text-main)]">{t('emailBodyLabel')}</h3>
          <p className="whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">{emailStatus.emailText}</p>
        </div>
      )}

      <AttachmentsList />
    </div>
  )
}

/* ── Confirmation dialog (uses native <dialog>) ── */
function SendConfirmDialog({ resolvedEmail, onConfirm, onCancel, t }: {
  readonly resolvedEmail: string
  readonly onConfirm: () => void
  readonly onCancel: () => void
  readonly t: ReturnType<typeof useTranslations<'sendTab'>>
}): ReactNode {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      data-testid="send-confirm-dialog"
      className="fixed inset-0 z-50 w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6 shadow-lg backdrop:bg-black/50"
      aria-labelledby="send-confirm-title"
      onClose={onCancel}
    >
      <h3 id="send-confirm-title" className="mb-2 text-lg font-semibold text-[var(--color-text-main)]">
        {t('confirmTitle')}
      </h3>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        {t('confirmMessage', { email: resolvedEmail })}
      </p>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          data-testid="send-confirm-cancel"
          onClick={onCancel}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-main)] hover:bg-[var(--color-surface)]"
        >
          {t('cancelBtn')}
        </button>
        <button
          type="button"
          data-testid="send-confirm-submit"
          onClick={onConfirm}
          className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Send size={16} aria-hidden="true" />
          {t('confirmSendBtn')}
        </button>
      </div>
    </dialog>
  )
}

/* ── Main SendTab ── */
export function SendTab({ offerId, token, contactEmail }: SendTabProps): ReactNode {
  const t = useTranslations('sendTab')
  const {
    emailStatus,
    isLoading,
    isGenerating,
    isSending,
    error,
    quotaExceeded,
    noCv,
    noCoverLetter,
    generateEmail,
    sendApplication,
    clearError,
  } = useJobApplicationSend(offerId, token)

  const { contacts } = useRecruitmentContacts(offerId, token)

  const [recipientMode, setRecipientMode] = useState<string>('')
  const [manualEmail, setManualEmail] = useState('')
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const recipientOptions = useMemo(() => {
    const options: { value: string; label: string }[] = []

    if (contactEmail) {
      options.push({ value: contactEmail, label: `${contactEmail} (${t('offerContact')})` })
    }

    for (const contact of contacts) {
      if (contact.email && contact.email !== contactEmail) {
        const label = contact.role
          ? `${contact.email} (${contact.name} — ${contact.role})`
          : `${contact.email} (${contact.name})`
        options.push({ value: contact.email, label })
      }
    }

    options.push({ value: MANUAL_INPUT_VALUE, label: t('manualInput') })
    return options
  }, [contacts, contactEmail, t])

  const selectedRecipient = recipientMode || (recipientOptions.length > 1 ? recipientOptions[0].value : MANUAL_INPUT_VALUE)
  const resolvedEmail = selectedRecipient === MANUAL_INPUT_VALUE ? manualEmail.trim() : selectedRecipient
  const canSend = !!(emailStatus?.hasEmail && resolvedEmail && !isSending)
  const canGenerate = !noCv && !noCoverLetter && !quotaExceeded && !isGenerating
  const prerequisitesNotMet = noCv || noCoverLetter
  const noRecipientTooltip = resolvedEmail ? undefined : t('noRecipientTooltip')

  const handleRecipientChange = useCallback((value: string): void => {
    setRecipientMode(value)
    if (value !== MANUAL_INPUT_VALUE) {
      setManualEmail('')
    }
  }, [])

  const handleConfirmSend = useCallback((): void => {
    setIsConfirmOpen(false)
    void sendApplication(resolvedEmail)
  }, [sendApplication, resolvedEmail])

  const handleCancelSend = useCallback((): void => {
    setIsConfirmOpen(false)
  }, [])

  if (isLoading) {
    return (
      <div data-testid="send-tab-loading" className="space-y-3 animate-pulse">
        <div className="h-8 w-48 rounded bg-[var(--color-border)]" />
        <div className="h-32 rounded bg-[var(--color-border)]" />
      </div>
    )
  }

  if (emailStatus?.status === 'sent') {
    return <SentView emailStatus={emailStatus} t={t} />
  }

  const errorBanner = error && !quotaExceeded && !noCv && !noCoverLetter ? (
    <div
      data-testid="send-tab-error"
      className="rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-3"
    >
      <p className="text-sm text-[var(--color-error)]">{error}</p>
      <button
        type="button"
        onClick={clearError}
        className="mt-1 text-xs text-[var(--color-primary)] hover:underline"
      >
        {t('dismiss')}
      </button>
    </div>
  ) : null

  return (
    <div data-testid="send-tab" className="space-y-4">
      {errorBanner}

      {noCv && (
        <div
          data-testid="send-tab-no-cv"
          className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-3"
        >
          <AlertCircle size={16} className="text-[var(--color-error)]" aria-hidden="true" />
          <p className="text-sm text-[var(--color-error)]">{t('noCv')}</p>
        </div>
      )}

      {noCoverLetter && (
        <div
          data-testid="send-tab-no-cover-letter"
          className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-3"
        >
          <AlertCircle size={16} className="text-[var(--color-error)]" aria-hidden="true" />
          <p className="text-sm text-[var(--color-error)]">{t('noCoverLetter')}</p>
        </div>
      )}

      {quotaExceeded && (
        <div
          data-testid="send-tab-quota-exceeded"
          className="rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-4 text-center"
        >
          <p className="text-sm text-[var(--color-error)]">{t('quotaExceeded')}</p>
        </div>
      )}

      {!emailStatus?.hasEmail && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6 text-center space-y-3">
          <p className="text-sm text-[var(--color-text-muted)]">
            {prerequisitesNotMet ? t('generateFirst') : t('generateDescription')}
          </p>
          <button
            type="button"
            data-testid="email-generate-button"
            onClick={() => void generateEmail()}
            disabled={!canGenerate || prerequisitesNotMet}
            aria-disabled={!canGenerate || prerequisitesNotMet}
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t('generating')}
              </span>
            ) : (
              t('generateBtn')
            )}
          </button>
        </div>
      )}

      {emailStatus?.hasEmail && emailStatus.emailText && (
        <div className="space-y-4">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4">
            <h3 className="mb-2 text-sm font-medium text-[var(--color-text-main)]">{t('emailBodyLabel')}</h3>
            <textarea
              data-testid="email-body-textarea"
              className="w-full min-h-[120px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text-main)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] resize-y"
              defaultValue={emailStatus.emailText}
              aria-label={t('emailBodyLabel')}
            />
          </div>

          <AttachmentsList />

          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4">
            <h3 className="mb-2 text-sm font-medium text-[var(--color-text-main)]">{t('recipientLabel')}</h3>
            <select
              data-testid="email-recipient-select"
              value={selectedRecipient}
              onChange={(e) => handleRecipientChange(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-main)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              aria-label={t('recipientLabel')}
            >
              {recipientOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {selectedRecipient === MANUAL_INPUT_VALUE && (
              <input
                type="email"
                data-testid="email-recipient-manual-input"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder={t('manualInputPlaceholder')}
                className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-main)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                aria-label={t('manualInputPlaceholder')}
              />
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              data-testid="email-send-button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={!canSend}
              aria-disabled={!canSend}
              title={noRecipientTooltip}
              className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t('sending')}
                </>
              ) : (
                <>
                  <Send size={16} aria-hidden="true" />
                  {t('sendBtn')}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {prerequisitesNotMet && !emailStatus?.hasEmail && (
        <p data-testid="send-tab-generate-first" className="text-center text-xs text-[var(--color-text-muted)]">
          {t('generateFirst')}
        </p>
      )}

      {isConfirmOpen && (
        <SendConfirmDialog
          resolvedEmail={resolvedEmail}
          onConfirm={handleConfirmSend}
          onCancel={handleCancelSend}
          t={t}
        />
      )}
    </div>
  )
}
