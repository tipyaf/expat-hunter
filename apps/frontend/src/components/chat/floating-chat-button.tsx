'use client'

import { ChatPanel } from '@/components/chat/chat-panel'
import { useAuth } from '@/contexts/auth-context'
import { useChat } from '@/hooks/use-chat'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

function getPageFromPathname(pathname: string): string {
  if (pathname.includes('/emails')) return 'emails'
  if (pathname.includes('/suivi')) return 'suivi'
  if (pathname.includes('/contacts')) return 'contacts'
  if (pathname.includes('/recherche')) return 'recherche'
  if (pathname.includes('/parametres')) return 'settings'
  if (pathname === '/' || pathname.includes('/dashboard')) return 'dashboard'
  return 'other'
}

export function FloatingChatButton() {
  const { user } = useAuth()
  const t = useTranslations('chat')
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { messages, isLoading, sendMessage, clearMessages, quota } = useChat()

  if (!user) return null

  const page = getPageFromPathname(pathname)
  const context = { page }

  return (
    <>
      {isOpen && (
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
          onClear={clearMessages}
          onClose={() => setIsOpen(false)}
          context={context}
          quota={quota}
        />
      )}

      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
          aria-label={t('openChat')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
              {messages.filter((m) => m.role === 'assistant').length}
            </span>
          )}
        </button>
      )}
    </>
  )
}
