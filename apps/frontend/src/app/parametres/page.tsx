'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/contexts/auth-context'
import { useTheme } from '@/contexts/theme-context'
import { useSendingSettings } from '@/hooks/use-sending-settings'
import { apiClient } from '@/lib/api-client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { FileText, Sliders, ChevronRight, Ban, Mail } from 'lucide-react'

interface FollowUpSequence {
  delayDays1: number
  delayDays2: number
  delayDays3: number
}

type ThemeOption = 'auto' | 'light' | 'dark'

export default function SettingsPage() {
  const { user, token } = useAuth()
  const { theme, setTheme } = useTheme()
  const t = useTranslations('settings')
  const ta = useTranslations('auth')
  const tc = useTranslations('common')

  const [locale, setLocale] = useState(user?.locale ?? 'fr')
  const [followUp, setFollowUp] = useState<FollowUpSequence>({
    delayDays1: 3,
    delayDays2: 7,
    delayDays3: 14,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const { settings: sendingSettings } = useSendingSettings()

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

  const themeOptions: { value: ThemeOption; label: string }[] = [
    { value: 'auto', label: t('darkModeAuto') },
    { value: 'light', label: t('darkModeLight') },
    { value: 'dark', label: t('darkModeDark') },
  ]

  if (!user) return null

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 md:px-8 pt-8 pb-4 pl-16 md:pl-8 bg-[var(--color-bg-light)]">
          <h1 className="text-3xl font-bold text-primary mb-2">{t('title')}</h1>
          <p className="text-[var(--color-text-muted)]">{t('subtitle')}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8">
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
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-semibold">{t('followUpTitle')}</h2>
                <span className="text-xs text-[var(--color-text-muted)] mt-1">
                  {t('followUpLimit', { max: sendingSettings.limits.maxFollowUps })}
                </span>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].slice(0, sendingSettings.limits.maxFollowUps).map((i) => {
                  const key = `delayDays${i}` as keyof FollowUpSequence
                  const minDays = sendingSettings.limits.minFollowUpDelay
                  const unit = sendingSettings.limits.minFollowUpDelayUnit
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <label className="text-sm font-medium w-28">
                        {t('followUp', { n: i })}
                      </label>
                      <span className="text-sm text-[var(--color-text-muted)]">J+</span>
                      <input
                        type="number"
                        min={minDays}
                        max={365}
                        value={followUp[key]}
                        onChange={(e) =>
                          setFollowUp((prev) => ({
                            ...prev,
                            [key]: Math.max(minDays, Number(e.target.value) || minDays),
                          }))
                        }
                        className="w-16 rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {t('followUpMinDelay', { min: minDays, unit })}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Raccourcis templates et presets */}
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6">
              <h2 className="text-lg font-semibold mb-4">{t('emailCustomization')}</h2>
              <div className="space-y-2">
                <Link
                  href="/parametres/templates"
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-3 hover:bg-[var(--color-bg-light)] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-main)]">{t('templatesLink')}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{t('templatesDesc')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-main)] transition-colors" />
                </Link>
                <Link
                  href="/parametres/presets"
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-3 hover:bg-[var(--color-bg-light)] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Sliders className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-main)]">{t('presetsLink')}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{t('presetsDesc')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-main)] transition-colors" />
                </Link>
                <Link
                  href="/parametres/blocages"
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-3 hover:bg-[var(--color-bg-light)] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Ban className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-main)]">{t('blockedLink')}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{t('blockedDesc')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-main)] transition-colors" />
                </Link>
                <Link
                  href="/parametres/connexion-email"
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-3 hover:bg-[var(--color-bg-light)] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-main)]">{t('connexionEmailLink')}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{t('connexionEmailDesc')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-main)] transition-colors" />
                </Link>
              </div>
            </section>

            {/* Langue */}
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6">
              <h2 className="text-lg font-semibold mb-4">{t('language')}</h2>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                aria-label={t('language')}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="fr">{ta('localeFr')}</option>
                <option value="en">{ta('localeEn')}</option>
              </select>
            </section>

            {/* Mode sombre */}
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6">
              <h2 className="text-lg font-semibold mb-4">{t('darkMode')}</h2>
              <div className="flex gap-2 flex-wrap">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    aria-pressed={theme === opt.value}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                      theme === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-primary/40 hover:text-[var(--color-text-main)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Message + Bouton */}
            {message && (
              <div
                role="alert"
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
              className="inline-flex items-center justify-center rounded-lg font-medium transition-colors bg-primary text-white hover:bg-primary-hover px-6 py-2 text-sm disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {saving ? tc('saving') : tc('save')}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
