'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface AdminUser {
  id: string
  email: string
  fullName: string
  isAdmin: boolean
  createdAt: string
}

export default function AdminUsersPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const t = useTranslations('admin')
  const tc = useTranslations('common')

  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user && !user.isAdmin) router.replace('/')
  }, [user, router])

  const fetchUsers = useCallback(async () => {
    if (!token) return
    try {
      const res = await apiClient.get<{ data: AdminUser[] }>('/api/admin/users', { token })
      setUsers(res.data)
    } catch {
      // 403
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleToggle = async (userId: string, isAdmin: boolean) => {
    if (!token || userId === user?.id) return
    try {
      await apiClient.patch(`/api/admin/users/${userId}/admin`, { isAdmin }, { token })
      fetchUsers()
    } catch {
      // error
    }
  }

  if (!user?.isAdmin) return null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-8 pt-8 pb-4 bg-[var(--color-bg-light)]">
          <h1 className="text-3xl font-bold text-primary mb-2">{t('usersTitle')}</h1>
          <p className="text-[var(--color-text-muted)]">{t('usersSubtitle')}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {isLoading ? (
            <p className="text-[var(--color-text-muted)]">{tc('loading')}</p>
          ) : (
            <div className="max-w-3xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left">
                    <th className="py-3 font-medium">{t('colName')}</th>
                    <th className="py-3 font-medium">{t('colEmail')}</th>
                    <th className="py-3 font-medium text-center">{t('colAdmin')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-[var(--color-border)]">
                      <td className="py-3">{u.fullName}</td>
                      <td className="py-3 text-[var(--color-text-muted)]">{u.email}</td>
                      <td className="py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(u.id, !u.isAdmin)}
                          disabled={u.id === user?.id}
                          className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
                            u.isAdmin
                              ? 'bg-primary/10 text-primary'
                              : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
                          } ${u.id === user?.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                        >
                          {u.isAdmin ? t('admin') : t('user')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
