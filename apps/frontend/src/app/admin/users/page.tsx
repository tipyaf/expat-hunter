'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { Crown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

type PlanFilter = 'all' | 'free' | 'premium'

interface AdminUser {
  id: string
  email: string
  fullName: string
  isAdmin: boolean
  plan: 'free' | 'premium'
  createdAt: string
}

export default function AdminUsersPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const t = useTranslations('admin')
  const tc = useTranslations('common')

  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all')

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

  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    if (!token || userId === user?.id) return
    try {
      await apiClient.patch(`/api/admin/users/${userId}/admin`, { isAdmin }, { token })
      fetchUsers()
    } catch {
      // error
    }
  }

  const handleTogglePlan = async (userId: string, plan: 'free' | 'premium') => {
    if (!token) return
    try {
      await apiClient.patch(`/api/admin/users/${userId}/plan`, { plan }, { token })
      fetchUsers()
    } catch {
      // error
    }
  }

  const filteredUsers = planFilter === 'all'
    ? users
    : users.filter((u) => u.plan === planFilter)

  if (!user?.isAdmin) return null

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 md:px-8 pt-8 pb-4 pl-16 md:pl-8 bg-[var(--color-bg-light)]">
          <h1 className="text-3xl font-bold text-primary mb-2">{t('usersTitle')}</h1>
          <p className="text-[var(--color-text-muted)]">{t('usersSubtitle')}</p>

          {/* Plan filter */}
          <div className="flex gap-2 mt-4">
            {(['all', 'free', 'premium'] as PlanFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setPlanFilter(filter)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  planFilter === filter
                    ? 'bg-primary text-white'
                    : 'bg-[var(--color-border)] text-[var(--color-text-muted)] hover:opacity-80'
                }`}
              >
                {t(`filter_${filter}`)} ({filter === 'all' ? users.length : users.filter((u) => u.plan === filter).length})
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8">
          {isLoading ? (
            <p className="text-[var(--color-text-muted)]">{tc('loading')}</p>
          ) : (
            <div className="max-w-4xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left">
                    <th className="py-3 font-medium">{t('colName')}</th>
                    <th className="py-3 font-medium">{t('colEmail')}</th>
                    <th className="py-3 font-medium text-center">{t('colPlan')}</th>
                    <th className="py-3 font-medium text-center">{t('colAdmin')}</th>
                    <th className="py-3 font-medium">{t('colDate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-[var(--color-border)]">
                      <td className="py-3">{u.fullName}</td>
                      <td className="py-3 text-[var(--color-text-muted)]">{u.email}</td>
                      <td className="py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePlan(u.id, u.plan === 'premium' ? 'free' : 'premium')}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-medium transition-colors cursor-pointer hover:opacity-80 ${
                            u.plan === 'premium'
                              ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
                              : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
                          }`}
                        >
                          {u.plan === 'premium' && <Crown className="h-3 w-3" />}
                          {u.plan === 'premium' ? t('premium') : t('free')}
                        </button>
                      </td>
                      <td className="py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAdmin(u.id, !u.isAdmin)}
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
                      <td className="py-3 text-[var(--color-text-muted)] text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
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
