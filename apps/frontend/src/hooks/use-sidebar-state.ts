'use client'

import { usePathname } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

const SIDEBAR_STORAGE_KEY = 'expat-hunter-sidebar-state'

type GroupId = 'prospection' | 'jobOffers' | 'settings' | 'administration'

/** Maps each sidebar group to the route prefixes it contains. */
const GROUP_ROUTES: Record<GroupId, string[]> = {
  prospection: ['/recherche', '/contacts', '/emails', '/suivi'],
  jobOffers: ['/recherche-offres', '/offres'],
  settings: ['/parametres'],
  administration: ['/admin'],
}

const DEFAULT_STATE: Record<GroupId, boolean> = {
  prospection: true,
  jobOffers: true,
  settings: false,
  administration: false,
}

function loadState(): Record<GroupId, boolean> {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE }
  try {
    const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, boolean>
      return {
        prospection: parsed.prospection ?? DEFAULT_STATE.prospection,
        jobOffers: parsed.jobOffers ?? DEFAULT_STATE.jobOffers,
        settings: parsed.settings ?? DEFAULT_STATE.settings,
        administration: parsed.administration ?? DEFAULT_STATE.administration,
      }
    }
  } catch {
    // Corrupted localStorage — fall back to defaults
  }
  return { ...DEFAULT_STATE }
}

function saveState(state: Record<GroupId, boolean>): void {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/** Returns the group ID that contains the given pathname, or null if top-level. */
function findActiveGroup(pathname: string): GroupId | null {
  for (const [groupId, routes] of Object.entries(GROUP_ROUTES)) {
    if (routes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
      return groupId as GroupId
    }
  }
  return null
}

export interface SidebarState {
  isGroupOpen: (groupId: GroupId) => boolean
  toggleGroup: (groupId: GroupId) => void
}

/**
 * Manages collapsible sidebar group open/closed state.
 * - Persisted in localStorage
 * - Auto-opens the group containing the active page
 */
export function useSidebarState(): SidebarState {
  const pathname = usePathname()
  const activeGroup = findActiveGroup(pathname)

  const [groupState, setGroupState] = useState<Record<GroupId, boolean>>(() => {
    const saved = loadState()
    // Auto-open the group containing the active page
    if (activeGroup) {
      saved[activeGroup] = true
    }
    return saved
  })

  const isGroupOpen = useCallback(
    (groupId: GroupId): boolean => {
      // Active group is always open (auto-open)
      if (groupId === activeGroup) return true
      return groupState[groupId] ?? false
    },
    [groupState, activeGroup]
  )

  const toggleGroup = useCallback(
    (groupId: GroupId): void => {
      setGroupState((prev) => {
        const next = { ...prev, [groupId]: !prev[groupId] }
        saveState(next)
        return next
      })
    },
    []
  )

  return useMemo(() => ({ isGroupOpen, toggleGroup }), [isGroupOpen, toggleGroup])
}

export { SIDEBAR_STORAGE_KEY, type GroupId, GROUP_ROUTES }
