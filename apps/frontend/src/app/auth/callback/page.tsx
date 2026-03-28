'use client'

import { useAuth } from '@/contexts/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthCallbackPage() {
  const searchParams = useSearchParams()
  const { loginWithToken } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('error')

    if (error) {
      router.push(`/login?error=${error}`)
      return
    }

    if (token) {
      loginWithToken(token)
    } else {
      router.push('/login')
    }
  }, [searchParams, loginWithToken, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-[var(--color-text-muted)]">Connecting...</p>
    </div>
  )
}
