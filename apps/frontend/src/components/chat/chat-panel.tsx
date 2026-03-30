'use client'

import type { ChatContext, ChatMessage, ChatMode } from '@/hooks/use-chat'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ChatLinkRenderer } from './chat-link-renderer'

interface ChatQuota {
  used: number
  limit: number | null
  remaining: number | null
}

interface ChatPanelProps {
  messages: ChatMessage[]
  isLoading: boolean
  onSendMessage: (content: string, context: ChatContext) => void
  onClear: () => void
  onClose: () => void
  context: ChatContext
  quota?: ChatQuota | null
}

function getPageSuggestions(t: (key: string) => string): Record<string, string[]> {
  return {
    emails: [
      t('suggestion_emails_1'),
      t('suggestion_emails_2'),
      t('suggestion_emails_3'),
    ],
    suivi: [
      t('suggestion_suivi_1'),
      t('suggestion_suivi_2'),
      t('suggestion_suivi_3'),
    ],
    contacts: [
      t('suggestion_contacts_1'),
      t('suggestion_contacts_2'),
      t('suggestion_contacts_3'),
    ],
    recherche: [
      t('suggestion_recherche_1'),
      t('suggestion_recherche_2'),
      t('suggestion_recherche_3'),
    ],
    default: [
      t('suggestion_default_1'),
      t('suggestion_default_2'),
      t('suggestion_default_3'),
    ],
  }
}

function ModeBadge({ mode }: { mode: ChatMode }) {
  const t = useTranslations('chat')
  const labels: Record<ChatMode, string> = {
    support: t('modeSupport'),
    expert: t('modeExpert'),
    mixed: t('modeMixed'),
  }
  const colors: Record<ChatMode, string> = {
    support: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    expert: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    mixed: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  }
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[mode]}`}
    >
      {labels[mode]}
    </span>
  )
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <span
        className="h-2 w-2 rounded-full bg-[var(--color-text-muted)] animate-bounce [animation-delay:0ms]"
      />
      <span
        className="h-2 w-2 rounded-full bg-[var(--color-text-muted)] animate-bounce [animation-delay:150ms]"
      />
      <span
        className="h-2 w-2 rounded-full bg-[var(--color-text-muted)] animate-bounce [animation-delay:300ms]"
      />
    </div>
  )
}

export function ChatPanel({
  messages,
  isLoading,
  onSendMessage,
  onClear,
  onClose,
  context,
  quota,
}: ChatPanelProps) {
  const t = useTranslations('chat')
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentMode: ChatMode =
    messages.length > 0
      ? (messages.findLast((m) => m.mode)?.mode ?? 'support')
      : 'support'

  const pageSuggestions = getPageSuggestions(t)
  const suggestions = pageSuggestions[context.page] ?? pageSuggestions['default']

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    onSendMessage(trimmed, context)
    setInput('')
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSuggestion(suggestion: string) {
    onSendMessage(suggestion, context)
  }

  return (
    <div
      className="fixed bottom-0 right-0 z-50 flex h-[600px] w-[380px] max-h-[90vh] flex-col rounded-tl-2xl rounded-bl-none shadow-2xl border border-[var(--color-border)] bg-[var(--color-bg-light)]"
      role="dialog"
      aria-label={t('title')}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm text-[var(--color-text-main)] truncate">
            {t('title')}
          </span>
          <ModeBadge mode={currentMode} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-light)] transition-colors"
              aria-label={t('clearHistory')}
            >
              {t('clearHistory')}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-light)] transition-colors"
            aria-label={t('closeChat')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-muted)]">{t('welcomeMessage')}</p>
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                {t('suggestionsTitle')}
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestion(suggestion)}
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-1.5 text-xs text-[var(--color-text-main)] hover:border-primary hover:text-primary transition-colors text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-[var(--color-surface-light)] text-[var(--color-text-main)] rounded-bl-sm border border-[var(--color-border)]'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2 prose-a:text-primary text-[var(--color-text-main)] prose-strong:text-[var(--color-text-main)] prose-headings:text-[var(--color-text-main)]">
                  <ReactMarkdown components={{ a: ChatLinkRenderer }}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              {msg.role === 'assistant' && msg.mode && (
                <div className="mt-1.5">
                  <ModeBadge mode={msg.mode} />
                </div>
              )}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {msg.actions.map((action) => (
                    <button
                      key={action.type}
                      type="button"
                      className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-[var(--color-border)] bg-[var(--color-surface-light)]">
              <LoadingDots />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--color-border)] p-3">
        {/* Quota counter for free users */}
        {quota && quota.remaining !== null && (
          <div className={`mb-2 text-xs text-center ${quota.remaining <= 3 ? 'text-[var(--color-error)] font-medium' : 'text-[var(--color-text-muted)]'}`}>
            {quota.remaining > 0
              ? t('quotaRemaining', { remaining: quota.remaining, limit: quota.limit ?? 0 })
              : t('quotaExhausted')}
          </div>
        )}
        {quota && quota.remaining === 0 ? (
          <div className="text-center py-2">
            <a
              href="/upgrade"
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-shadow"
            >
              {t('upgradeForChat')}
            </a>
          </div>
        ) : (
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-2 text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors max-h-32 overflow-y-auto"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
            aria-label={t('placeholder')}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={t('send')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        )}
      </div>
    </div>
  )
}
