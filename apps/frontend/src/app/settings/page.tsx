'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface FollowUpSequence {
  delayDays1: number
  delayDays2: number
  delayDays3: number
}

export default function SettingsPage() {
  const { user, token } = useAuth()
  const t = useTranslations('settings')
  const tc = useTranslations('common')

  const [locale, setLocale] = useState(user?.locale ?? 'fr')
  const [followUp, setFollowUp] = useState<FollowUpSequence>({
    delayDays1: 3,
    delayDays2: 7,
    delayDays3: 14,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!token) return
    apiClient
      .get<{ data: { followUpSequence?: FollowUpSequence } }>('/api/profile', { token })
      .then((res) => {
        if (res.data?.followUpSequence) {
          setFollowUp(res.data.followUpSequence)
        }
      })
      .catch(() => {})
  }, [token])

  const handleSave = async () => {
    if (!token) return
    setSaving(true)
    setMessage(null)
    try {
      await apiClient.put('/api/profile', { locale, followUpSequence: followUp }, { token })
      setMessage({ text: t('saveSuccess'), type: 'success' })
    } catch {
      setMessage({ text: t('saveError'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-8 pt-8 pb-4 bg-[var(--color-bg-light)]">
          <h1 className="text-3xl font-bold text-primary mb-2">{t('title')}</h1>
          <p className="text-[var(--color-text-muted)]">{t('subtitle')}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <div className="max-w-2xl space-y-8">
            {/* Compte */}
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6">
              <h2 className="text-lg font-semibold mb-4">{t('account')}</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('emailLabel')}</label>
                  <p className="text-[var(--color-text-muted)]">{user.email}</p>
                </div>
              </div>
            </section>

            {/* Séquences de relance */}
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6">
              <h2 className="text-lg font-semibold mb-4">{t('followUpTitle')}</h2>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => {
                  const key = `delayDays${i}` as keyof FollowUpSequence
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <label className="text-sm font-medium w-28">
                        {t('followUp', { n: i })}
                      </label>
                      <span className="text-sm text-[var(--color-text-muted)]">J+</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={followUp[key]}
                        onChange={(e) =>
                          setFollowUp((prev) => ({
                            ...prev,
                            [key]: Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                          }))
                        }
                        className="w-16 rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-1 text-sm text-center"
                      />
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Langue */}
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6">
              <h2 className="text-lg font-semibold mb-4">{t('language')}</h2>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </section>

            {/* Message + Bouton */}
            {message && (
              <div
                className={`rounded-lg px-4 py-2 text-sm ${
                  message.type === 'success'
                    ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                    : 'bg-[var(--color-error)]/10 text-[var(--color-error)]'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-lg font-medium transition-colors bg-primary text-white hover:bg-primary-hover px-6 py-2 text-sm disabled:opacity-50"
            >
              {saving ? tc('saving') : tc('save')}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
