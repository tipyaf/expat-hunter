'use client'

import { ApiError, apiClient } from '@/lib/api-client'
import { usePathname, useRouter } from 'next/navigation'
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

interface User {
  id: string
  email: string
  fullName: string
  locale: string
  isAdmin: boolean
  plan: 'free' | 'premium'
}

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  loginWithToken: (token: string) => Promise<void>
}

interface RegisterData {
  email: string
  password: string
  fullName: string
  locale?: string
}

interface AuthResponse {
  user: User
  token: string
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'expathunter_token'

const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/auth/callback']

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const saveToken = useCallback((newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)
  }, [])

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const fetchUser = useCallback(
    async (accessToken: string) => {
      try {
        const userData = await apiClient.get<User>('/api/auth/me', {
          token: accessToken,
        })
        setUser(userData)
        setToken(accessToken)
      } catch {
        clearAuth()
      }
    },
    [clearAuth],
  )

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (stored) {
      fetchUser(stored).finally(() => {
        setIsLoading(false)
      })
    } else {
      setIsLoading(false)
    }
  }, [fetchUser])

  useEffect(() => {
    if (isLoading) {
      return
    }
    if (!token && !publicPaths.includes(pathname)) {
      router.replace('/login')
    }
    // Redirect authenticated users away from login/register
    if (token && user && publicPaths.includes(pathname)) {
      router.replace('/')
    }
  }, [isLoading, token, user, pathname, router])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiClient.post<AuthResponse>('/api/auth/login', {
        email,
        password,
      })
      saveToken(res.token)
      setUser(res.user)
      router.push('/')
    },
    [router, saveToken],
  )

  const register = useCallback(
    async (data: RegisterData) => {
      const res = await apiClient.post<AuthResponse>('/api/auth/register', data)
      saveToken(res.token)
      setUser(res.user)
      router.push('/')
    },
    [router, saveToken],
  )

  const logout = useCallback(async () => {
    try {
      if (token) {
        await apiClient.post('/api/auth/logout', undefined, { token })
      }
    } catch {
      // Ignore errors on logout
    } finally {
      clearAuth()
      router.push('/login')
    }
  }, [token, clearAuth, router])

  const loginWithToken = useCallback(
    async (accessToken: string) => {
      try {
        saveToken(accessToken)
        const userData = await apiClient.get<User>('/api/auth/me', { token: accessToken })
        setUser(userData)
        router.push('/')
      } catch {
        clearAuth()
        router.push('/login?error=oauth_failed')
      }
    },
    [router, saveToken, clearAuth],
  )

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, logout, loginWithToken }),
    [user, token, isLoading, login, register, logout, loginWithToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export { ApiError }
