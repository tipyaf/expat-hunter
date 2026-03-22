'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useThread, type EmailReply } from '@/hooks/use-thread'

interface ThreadViewProps {
  contactId: string
}

function EventBadge({ event }: { event: EmailReply['detectedEvent'] }) {
  const t = useTranslations('thread')
  if (!event) return null

  const styles: Record<string, string> = {
    interview: 'bg-cyan-100 text-cyan-700',
    rejection: 'bg-red-100 text-red-700',
    offer: 'bg-green-100 text-green-700',
    info_request: 'bg-yellow-100 text-yellow-800',
    other: 'bg-purple-100 text-purple-700',
  }

  const labelKey: Record<string, string> = {
    interview: 'eventInterview',
    rejection: 'eventRejection',
    offer: 'eventOffer',
    info_request: 'eventInfoRequest',
    other: 'eventOther',
  }

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[event] ?? styles.other}`}>
      {t(labelKey[event] as keyof ReturnType<typeof useTranslations<'thread'>>)}
    </span>
  )
}

function ReplyCard({ reply, onGenerateReply }: { reply: EmailReply; onGenerateReply: (id: string) => Promise<string> }) {
  const t = useTranslations('thread')
  const [expanded, setExpanded] = useState(false)
  const [suggestedReply, setSuggestedReply] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const suggestion = await onGenerateReply(reply.id)
      setSuggestedReply(suggestion)
    } finally {
      setIsGenerating(false)
    }
  }

  const date = new Date(reply.receivedAt).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 ${!reply.isRead ? 'border-l-4 border-l-primary' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{reply.fromEmail}</span>
          {!reply.isRead && (
            <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">
              {t('unread')}
            </span>
          )}
          <EventBadge event={reply.detectedEvent} />
        </div>
        <span className="text-xs text-[var(--color-text-muted)] shrink-0">{date}</span>
      </div>

      <p className="text-sm font-medium mb-1">{reply.subject}</p>

      {reply.bodyText && (
        <div>
          <p className="text-sm text-[var(--color-text-muted)] line-clamp-2">
            {expanded ? reply.bodyText : reply.bodyText.slice(0, 200)}
          </p>
          {reply.bodyText.length > 200 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline mt-1"
            >
              {expanded ? 'Réduire' : 'Voir plus'}
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={isGenerating}
          className="rounded-lg bg-primary/10 text-primary px-3 py-1 text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {isGenerating ? '...' : t('suggestReply')}
        </button>
      </div>

      {suggestedReply && (
        <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-light)] p-3">
          <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">{t('suggestedReply')}</p>
          <p className="text-sm whitespace-pre-wrap">{suggestedReply}</p>
        </div>
      )}
    </div>
  )
}

export function ThreadView({ contactId }: ThreadViewProps) {
  const t = useTranslations('thread')
  const { replies, emails, summary, isLoading, error, refresh, generateReply, syncReplies } = useThread(contactId)

  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await syncReplies()
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">Chargement...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-4 text-center text-[var(--color-error)] text-sm">{error}</div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={isSyncing}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg-light)] transition-colors disabled:opacity-50"
        >
          {isSyncing ? t('syncing') : t('sync')}
        </button>
      </div>

      {/* AI Summary */}
      {summary && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-light)] p-4">
          <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">{t('summary')}</p>
          <p className="text-sm">{summary}</p>
        </div>
      )}

      {/* Replies */}
      {replies.length === 0 && emails.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-8 text-center">
          <p className="text-[var(--color-text-muted)] text-sm">{t('noReplies')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {replies.map((reply) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              onGenerateReply={generateReply}
            />
          ))}
        </div>
      )}
    </div>
  )
}
