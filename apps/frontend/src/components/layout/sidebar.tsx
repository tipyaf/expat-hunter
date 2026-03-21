'use client'

import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const t = useTranslations('sidebar')
  const tc = useTranslations('common')
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { label: t('dashboard'), href: '/', icon: 'D' },
    { label: t('sourcing'), href: '/sourcing', icon: 'S' },
    { label: t('contacts'), href: '/contacts', icon: 'C' },
    { label: t('emails'), href: '/emails', icon: 'E' },
    { label: t('pipeline'), href: '/pipeline', icon: 'K' },
    { label: t('profile'), href: '/profile', icon: 'P' },
    { label: t('settings'), href: '/settings', icon: 'G' },
  ]

  const adminItems = user?.isAdmin
    ? [
        { label: t('aiSettings'), href: '/admin/ai-settings', icon: 'A' },
        { label: t('users'), href: '/admin/users', icon: 'U' },
      ]
    : []

  const close = () => setIsOpen(false)

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t('openMenu')}
        className="fixed top-4 left-4 z-50 md:hidden rounded-lg p-2 bg-primary text-white shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          flex h-full md:h-screen w-64 shrink-0 flex-col
          border-r border-[var(--color-border)] bg-[var(--color-surface-light)]
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        aria-label={tc('appName')}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-[var(--color-border)]">
          <Link href="/" className="text-xl font-bold text-primary" onClick={close}>
            {tc('appName')}
          </Link>
          {/* Mobile close button */}
          <button
            type="button"
            onClick={close}
            aria-label={t('closeMenu')}
            className="md:hidden rounded-lg p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1" role="navigation">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-[var(--color-text-muted)] hover:bg-primary/5 hover:text-[var(--color-text-main)]'
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}

          {adminItems.length > 0 && (
            <>
              <div className="my-3 border-t border-[var(--color-border)]" />
              <p className="px-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                {t('adminSection')}
              </p>
              {adminItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-[var(--color-text-muted)] hover:bg-primary/5 hover:text-[var(--color-text-main)]'
                    }`}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary" aria-hidden="true">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                )
              })}
            </>
          )}
        </nav>

        <div className="border-t border-[var(--color-border)] p-4">
          <div className="mb-2 text-sm font-medium truncate">{user?.fullName ?? ''}</div>
          <div className="mb-3 text-xs text-[var(--color-text-muted)] truncate">
            {user?.email ?? ''}
          </div>
          <button
            type="button"
            onClick={() => {
              void logout()
            }}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] hover:border-[var(--color-error)]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)]/50"
          >
            {t('logout')}
          </button>
        </div>
      </aside>
    </>
  )
}
