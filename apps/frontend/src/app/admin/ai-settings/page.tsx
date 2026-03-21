'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface AiSetting {
  id: string
  featureKey: string
  model: string
  temperature: number
  maxTokens: number
  isEnabled: boolean
}

const FEATURE_KEYS = ['default', 'cv_extraction', 'relevance_analysis', 'email_generation'] as const

export default function AiSettingsPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const t = useTranslations('admin')
  const tc = useTranslations('common')

  const [settings, setSettings] = useState<AiSetting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [form, setForm] = useState({ model: '', temperature: 0.3, maxTokens: 1024, isEnabled: true })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [cacheStats, setCacheStats] = useState<{
    totalEntries: number
    expiredEntries: number
    byType: Record<string, { count: number; avgAgeDays: number }>
    bySource: Record<string, number>
  } | null>(null)
  const [purging, setPurging] = useState(false)

  useEffect(() => {
    if (user && !user.isAdmin) router.replace('/')
  }, [user, router])

  const fetchSettings = useCallback(async () => {
    if (!token) return
    try {
      const res = await apiClient.get<{ data: AiSetting[] }>('/api/admin/ai-settings', { token })
      setSettings(res.data)
      const cacheRes = await apiClient.get<{ data: typeof cacheStats }>('/api/admin/ai-settings/cache/stats', { token })
      setCacheStats(cacheRes.data)
    } catch {
      // 403 = not admin
    } finally {
      setIsLoading(false)
    }
  }, [token])

  const handlePurgeCache = async () => {
    if (!token) return
    setPurging(true)
    try {
      await apiClient.post('/api/admin/ai-settings/cache/purge', {}, { token })
      const cacheRes = await apiClient.get<{ data: typeof cacheStats }>('/api/admin/ai-settings/cache/stats', { token })
      setCacheStats(cacheRes.data)
      setMessage(t('cachePurged'))
    } catch {
      setMessage(t('settingError'))
    } finally {
      setPurging(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleEdit = (key: string) => {
    const existing = settings.find((s) => s.featureKey === key)
    setForm({
      model: existing?.model ?? 'openai/gpt-4o-mini',
      temperature: existing?.temperature ?? 0.3,
      maxTokens: existing?.maxTokens ?? 1024,
      isEnabled: existing?.isEnabled ?? true,
    })
    setEditingKey(key)
    setMessage(null)
  }

  const handleSave = async () => {
    if (!token || !editingKey) return
    setSaving(true)
    try {
      await apiClient.put(`/api/admin/ai-settings/${editingKey}`, form, { token })
      setMessage(t('settingSaved'))
      setEditingKey(null)
      fetchSettings()
    } catch {
      setMessage(t('settingError'))
    } finally {
      setSaving(false)
    }
  }

  if (!user?.isAdmin) return null

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 md:px-8 pt-8 pb-4 pl-16 md:pl-8 bg-[var(--color-bg-light)]">
          <h1 className="text-3xl font-bold text-primary mb-2">{t('aiSettingsTitle')}</h1>
          <p className="text-[var(--color-text-muted)]">{t('aiSettingsSubtitle')}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8">
          {isLoading ? (
            <p className="text-[var(--color-text-muted)]">{tc('loading')}</p>
          ) : (
            <div className="max-w-3xl space-y-4">
              {FEATURE_KEYS.map((key) => {
                const setting = settings.find((s) => s.featureKey === key)
                const isEditing = editingKey === key

                return (
                  <div key={key} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{t(`feature_${key}`)}</h3>
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => handleEdit(key)}
                          className="text-sm text-primary hover:underline"
                        >
                          {t('configure')}
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 mt-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">{t('modelLabel')}</label>
                          <input
                            type="text"
                            value={form.model}
                            onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                            className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">{t('temperatureLabel')}</label>
                            <input
                              type="number"
                              step={0.1}
                              min={0}
                              max={2}
                              value={form.temperature}
                              onChange={(e) => setForm((f) => ({ ...f, temperature: Number(e.target.value) }))}
                              className="w-20 rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">{t('maxTokensLabel')}</label>
                            <input
                              type="number"
                              min={128}
                              max={8192}
                              value={form.maxTokens}
                              onChange={(e) => setForm((f) => ({ ...f, maxTokens: Number(e.target.value) }))}
                              className="w-24 rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-2 text-sm"
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <label className="text-sm font-medium">{t('enabledLabel')}</label>
                            <input
                              type="checkbox"
                              checked={form.isEnabled}
                              onChange={(e) => setForm((f) => ({ ...f, isEnabled: e.target.checked }))}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="rounded-lg bg-primary text-white px-4 py-1.5 text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
                          >
                            {saving ? tc('saving') : tc('save')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingKey(null)}
                            className="rounded-lg border border-[var(--color-border)] px-4 py-1.5 text-sm font-medium"
                          >
                            {tc('cancel')}
                          </button>
                        </div>
                      </div>
                    ) : setting ? (
                      <div className="text-sm text-[var(--color-text-muted)] space-y-1">
                        <p>{t('modelLabel')}: <span className="font-mono">{setting.model}</span></p>
                        <p>{t('temperatureLabel')}: {setting.temperature} | {t('maxTokensLabel')}: {setting.maxTokens}</p>
                        <p>{setting.isEnabled ? t('enabled') : t('disabled')}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-text-muted)]">{t('notConfigured')}</p>
                    )}
                  </div>
                )
              })}

              {/* Cache stats section */}
              {cacheStats && (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t('cacheTitle')}</h3>
                    <button
                      type="button"
                      onClick={() => void handlePurgeCache()}
                      disabled={purging}
                      className="text-sm text-red-600 hover:underline disabled:opacity-50"
                    >
                      {purging ? tc('loading') : t('cachePurge')}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="rounded-lg bg-[var(--color-bg-light)] p-3 text-center">
                      <p className="text-2xl font-bold text-primary">{cacheStats.totalEntries}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{t('cacheTotal')}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--color-bg-light)] p-3 text-center">
                      <p className="text-2xl font-bold text-amber-600">{cacheStats.expiredEntries}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{t('cacheExpired')}</p>
                    </div>
                  </div>
                  {Object.keys(cacheStats.byType).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase">{t('cacheByType')}</p>
                      {Object.entries(cacheStats.byType).map(([type, info]) => (
                        <div key={type} className="flex justify-between text-sm">
                          <span className="capitalize">{type}</span>
                          <span className="text-[var(--color-text-muted)]">
                            {info.count} {t('cacheEntries')} · ~{info.avgAgeDays}j
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {message && (
                <div className="rounded-lg bg-primary/10 text-primary px-4 py-2 text-sm">{message}</div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
