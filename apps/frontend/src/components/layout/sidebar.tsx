'use client'

import { useAuth } from '@/contexts/auth-context'
import { useDashboard } from '@/hooks/use-dashboard'
import { useOfferNotifications } from '@/hooks/use-offer-notifications'
import { usePlan } from '@/hooks/use-plan'
import { useSidebarState, type GroupId } from '@/hooks/use-sidebar-state'
import { CollapsibleNavGroup } from './collapsible-nav-group'
import {
  Home,
  Search,
  Briefcase,
  Users,
  Mail,
  Kanban,
  Crown,
  UserCircle,
  Settings,
  FileText,
  Sliders,
  Cpu,
  UsersRound,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: number
}

interface NavGroup {
  id: GroupId
  label: string
  items: NavItem[]
  badge?: number
}

export function Sidebar(): ReactNode {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { isFree } = usePlan()
  const { actions } = useDashboard()
  const t = useTranslations('sidebar')
  const tc = useTranslations('common')
  const [isOpen, setIsOpen] = useState(false)
  const sidebarState = useSidebarState()
  const { unreadCount: offersBadge } = useOfferNotifications()

  const emailBadge = actions.find((a) => a.type === 'emails_to_validate')?.count ?? 0
  const replyBadge = actions.find((a) => a.type === 'replies_received')?.count ?? 0

  // Top-level direct links (not in any group)
  const topLevelLinks: NavItem[] = [
    { label: t('dashboard'), href: '/', icon: Home },
  ]

  // Collapsible groups
  const prospectionGroup: NavGroup = {
    id: 'prospection',
    label: t('prospection'),
    items: [
      { label: t('search'), href: '/recherche', icon: Search },
      { label: t('contacts'), href: '/contacts', icon: Users, badge: replyBadge },
      { label: t('emails'), href: '/emails', icon: Mail, badge: emailBadge },
      { label: t('tracking'), href: '/suivi', icon: Kanban },
    ],
    badge: replyBadge + emailBadge > 0 ? replyBadge + emailBadge : undefined,
  }

  const jobOffersGroup: NavGroup = {
    id: 'jobOffers',
    label: t('jobOffers'),
    items: [
      { label: t('jobSearch'), href: '/recherche-offres', icon: Search },
      { label: t('myOffers'), href: '/offres', icon: Briefcase, badge: offersBadge > 0 ? offersBadge : undefined },
    ],
    badge: offersBadge > 0 ? offersBadge : undefined,
  }

  const settingsGroup: NavGroup = {
    id: 'settings',
    label: t('settings'),
    items: [
      { label: t('general'), href: '/parametres', icon: Settings },
      { label: t('templates'), href: '/parametres/templates', icon: FileText },
      { label: t('presets'), href: '/parametres/presets', icon: Sliders },
      { label: t('emailConnection'), href: '/parametres/connexion-email', icon: Mail },
      { label: t('blocklist'), href: '/parametres/blocages', icon: ShieldCheck },
    ],
  }

  const administrationGroup: NavGroup | null = user?.isAdmin
    ? {
        id: 'administration',
        label: t('adminSection'),
        items: [
          { label: t('aiSettings'), href: '/admin/ai-settings', icon: Cpu },
          { label: t('users'), href: '/admin/users', icon: UsersRound },
        ],
      }
    : null

  // Profile — direct link between groups and settings
  const profileLink: NavItem = { label: t('profile'), href: '/profil', icon: UserCircle }

  const close = (): void => setIsOpen(false)

  const renderLink = (item: NavItem): ReactNode => {
    const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
    const Icon = item.icon
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={close}
          aria-current={isActive ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-main)]'
          }`}
        >
          <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <span className="flex-1">{item.label}</span>
          {item.badge != null && item.badge > 0 && (
            <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </Link>
      </li>
    )
  }

  const renderDirectLink = (item: NavItem): ReactNode => {
    const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
    const Icon = item.icon
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={close}
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-main)]'
        }`}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        <span className="flex-1">{item.label}</span>
        {item.badge != null && item.badge > 0 && (
          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </Link>
    )
  }

  const renderGroup = (group: NavGroup): ReactNode => (
    <CollapsibleNavGroup
      key={group.id}
      label={group.label}
      isOpen={sidebarState.isGroupOpen(group.id)}
      onToggle={() => sidebarState.toggleGroup(group.id)}
      badge={group.badge}
    >
      {group.items.map(renderLink)}
    </CollapsibleNavGroup>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t('openMenu')}
        className="fixed top-4 left-4 z-50 md:hidden rounded-[var(--radius-md)] p-2 bg-primary text-white shadow-[var(--shadow-md)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={close} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          flex h-full md:h-dvh w-64 shrink-0 flex-col
          border-r border-[var(--color-border)] bg-[var(--color-surface-light)]
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        aria-label={tc('appName')}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-[var(--color-border)]">
          <Link href="/" className="text-xl font-bold text-primary tracking-tight" onClick={close}>
            {tc('appName')}
          </Link>
          <button
            type="button"
            onClick={close}
            aria-label={t('closeMenu')}
            className="md:hidden rounded-[var(--radius-sm)] p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" role="navigation">
          {/* Dashboard — direct link */}
          <div className="mb-2">
            {topLevelLinks.map(renderDirectLink)}
          </div>

          {/* Prospection group */}
          {renderGroup(prospectionGroup)}

          {/* Offres d'emploi group */}
          {renderGroup(jobOffersGroup)}

          {/* Separator */}
          <div className="my-3 border-t border-[var(--color-border)]" />

          {/* Profile — direct link */}
          <div className="mb-2">
            {renderDirectLink(profileLink)}
          </div>

          {/* Settings group */}
          {renderGroup(settingsGroup)}

          {/* Admin group (only for admin users) */}
          {administrationGroup && renderGroup(administrationGroup)}
        </nav>

        {/* Upgrade CTA for free users */}
        {isFree && (
          <div className="mx-3 mb-3">
            <Link
              href="/upgrade"
              onClick={close}
              className="flex items-center gap-2 rounded-[var(--radius-md)] bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
            >
              <Crown className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('upgrade')}
            </Link>
          </div>
        )}

        {/* User footer */}
        <div className="border-t border-[var(--color-border)] p-4">
          <div className="mb-1 text-sm font-medium text-[var(--color-text-main)] truncate">{user?.fullName ?? ''}</div>
          <div className="mb-3 text-xs text-[var(--color-text-muted)] truncate">{user?.email ?? ''}</div>
          <button
            type="button"
            onClick={() => { void logout() }}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] hover:border-[var(--color-error)]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)]/50"
          >
            <LogOut className="h-4 w-4" />
            {t('logout')}
          </button>
        </div>
      </aside>
    </>
  )
}
