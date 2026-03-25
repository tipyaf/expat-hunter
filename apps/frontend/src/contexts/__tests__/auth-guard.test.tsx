import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- mocks declared before imports that use them ---

const mockRouterReplace = vi.fn()
const mockPathname = vi.fn(() => '/')

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockRouterReplace, push: vi.fn() }),
  usePathname: () => mockPathname(),
}))

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockRejectedValue(new Error('no token')),
    post: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

import { AuthProvider } from '../auth-context'

// ---------------------------------------------------------------------------

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('Auth guard — publicPaths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('does NOT redirect when unauthenticated user visits /login', async () => {
    mockPathname.mockReturnValue('/login')
    render(<Wrapper><div /></Wrapper>)
    // wait for effects
    await vi.waitFor(() => expect(mockRouterReplace).not.toHaveBeenCalledWith('/login'))
  })

  it('does NOT redirect when unauthenticated user visits /register', async () => {
    mockPathname.mockReturnValue('/register')
    render(<Wrapper><div /></Wrapper>)
    await vi.waitFor(() => expect(mockRouterReplace).not.toHaveBeenCalledWith('/login'))
  })

  it('does NOT redirect when unauthenticated user visits /forgot-password', async () => {
    mockPathname.mockReturnValue('/forgot-password')
    render(<Wrapper><div /></Wrapper>)
    await vi.waitFor(() => expect(mockRouterReplace).not.toHaveBeenCalledWith('/login'))
  })

  it('does NOT redirect when unauthenticated user visits /reset-password', async () => {
    mockPathname.mockReturnValue('/reset-password')
    render(<Wrapper><div /></Wrapper>)
    await vi.waitFor(() => expect(mockRouterReplace).not.toHaveBeenCalledWith('/login'))
  })

  it('redirects to /login when unauthenticated user visits a protected route', async () => {
    mockPathname.mockReturnValue('/dashboard')
    render(<Wrapper><div /></Wrapper>)
    await vi.waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith('/login'))
  })

  it('redirects to /login when unauthenticated user visits /', async () => {
    mockPathname.mockReturnValue('/')
    render(<Wrapper><div /></Wrapper>)
    await vi.waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith('/login'))
  })
})
