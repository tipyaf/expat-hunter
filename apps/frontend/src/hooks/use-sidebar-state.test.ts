import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

import { usePathname } from 'next/navigation'
import { useSidebarState } from './use-sidebar-state'

// --- NAV GROUP DEFINITIONS (must match production code) ---
const SIDEBAR_STORAGE_KEY = 'expat-hunter-sidebar-state'

describe('useSidebarState', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.mocked(usePathname).mockReturnValue('/')
  })

  // ORACLE: After toggle, localStorage.getItem returns updated state; on re-mount, state matches
  it('persists open/closed state to localStorage and restores on mount', () => {
    const { result, unmount } = renderHook(() => useSidebarState())

    // Toggle 'prospection' group closed
    act(() => {
      result.current.toggleGroup('prospection')
    })

    // Verify localStorage was updated
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      SIDEBAR_STORAGE_KEY,
      expect.any(String)
    )

    const savedState = JSON.parse(
      localStorageMock.setItem.mock.calls.at(-1)?.[1] ?? '{}'
    )
    expect(savedState.prospection).toBe(false)

    unmount()

    // Re-mount — state should be restored from localStorage
    const { result: result2 } = renderHook(() => useSidebarState())
    expect(result2.current.isGroupOpen('prospection')).toBe(false)
  })

  // ORACLE: pathname=/emails → Prospection group isOpen=true
  it('auto-opens the group containing the active page', () => {
    vi.mocked(usePathname).mockReturnValue('/emails')
    const { result } = renderHook(() => useSidebarState())

    // 'emails' is under Prospection group — should be open
    expect(result.current.isGroupOpen('prospection')).toBe(true)
  })

  it('auto-opens Offres d\'emploi group when on /offres', () => {
    vi.mocked(usePathname).mockReturnValue('/offres')
    const { result } = renderHook(() => useSidebarState())

    expect(result.current.isGroupOpen('jobOffers')).toBe(true)
  })

  it('auto-opens Paramètres group when on /parametres/templates', () => {
    vi.mocked(usePathname).mockReturnValue('/parametres/templates')
    const { result } = renderHook(() => useSidebarState())

    expect(result.current.isGroupOpen('settings')).toBe(true)
  })

  it('auto-opens Administration group when on /admin/ai-settings', () => {
    vi.mocked(usePathname).mockReturnValue('/admin/ai-settings')
    const { result } = renderHook(() => useSidebarState())

    expect(result.current.isGroupOpen('administration')).toBe(true)
  })

  it('toggleGroup flips the state for a group', () => {
    const { result } = renderHook(() => useSidebarState())

    // Default: prospection open
    expect(result.current.isGroupOpen('prospection')).toBe(true)

    act(() => {
      result.current.toggleGroup('prospection')
    })
    expect(result.current.isGroupOpen('prospection')).toBe(false)

    act(() => {
      result.current.toggleGroup('prospection')
    })
    expect(result.current.isGroupOpen('prospection')).toBe(true)
  })
})
