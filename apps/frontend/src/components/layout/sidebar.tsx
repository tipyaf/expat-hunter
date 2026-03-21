'use client'

import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const t = useTranslations('sidebar')
  const tc = useTranslations('common')

  const navItems = [
    { label: t('dashboard'), href: '/', icon: 'D' },
    { label: t('sourcing'), href: '/sourcing', icon: 'S' },
    { label: t('contacts'), href: '/contacts', icon: 'C' },
    { label: t('emails'), href: '/emails', icon: 'E' },
    { label: t('profile'), href: '/profile', icon: 'P' },
  ]

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-light)]">
      <div className="flex h-16 items-center px-6 border-b border-[var(--color-border)]">
        <Link href="/" className="text-xl font-bold text-primary">
          {tc('appName')}
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-[var(--color-text-muted)] hover:bg-primary/5 hover:text-[var(--color-text-main)]'
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
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
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] hover:border-[var(--color-error)]/30"
        >
          {t('logout')}
        </button>
      </div>
    </aside>
  )
}
