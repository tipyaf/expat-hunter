'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/contexts/auth-context'
import { useTheme } from '@/contexts/theme-context'
import { useSendingSettings } from '@/hooks/use-sending-settings'
import { apiClient } from '@/lib/api-client'
import { StatusMessage } from '@/components/ui/status-message'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { FileText, Sliders, ChevronRight, Ban, Mail, Plus, Trash2 } from 'lucide-react'

type DelayUnit = 'days' | 'weeks' | 'months'

interface FollowUpItem {
  delay: number
  unit: DelayUnit
}

interface SendingSchedule {
  allowedDays: string[]
  startHour: number
  endHour: number
  timezone: string
}

type ThemeOption = 'auto' | 'light' | 'dark'

const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const QUARTER_HOURS = Array.from({ length: 96 }, (_, i) => i * 0.25)

const COMMON_TIMEZONES = [
  'Pacific/Auckland',
  'Australia/Sydney',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Europe/Paris',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Zurich',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
]

export default function SettingsPage() {
  const { user, token } = useAuth()
  const { theme, setTheme } = useTheme()
  const t = useTranslations('settings')
  const ta = useTranslations('auth')
  const tc = useTranslations('common')

  const [locale, setLocale] = useState(user?.locale ?? 'fr')
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([
    { delay: 7, unit: 'days' },
  ])
  const [schedule, setSchedule] = useState<SendingSchedule>({
    allowedDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    startHour: 8,
    endHour: 18,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const { settings: sendingSettings } = useSendingSettings()

  const maxFollowUps = sendingSettings.limits.maxFollowUps

  useEffect(() => {
    if (!token) return
    apiClient
      .get<{ data: { followUps?: FollowUpItem[]; sendingSchedule?: SendingSchedule } }>('/api/profile', { token })
      .then((res) => {
        if (res.data?.followUps && res.data.followUps.length > 0) {
          setFollowUps(res.data.followUps)
        }
        if (res.data?.sendingSchedule) {
          setSchedule(res.data.sendingSchedule)
        }
      })
      .catch(() => {})
  }, [token])

  const addFollowUp = () => {
    if (followUps.length >= maxFollowUps) return
    const lastDelay = followUps[followUps.length - 1]?.delay ?? 7
    setFollowUps((prev) => [...prev, { delay: lastDelay + 7, unit: 'days' }])
  }

  const removeFollowUp = (index: number) => {
    if (followUps.length <= 1) return
    setFollowUps((prev) => prev.filter((_, i) => i !== index))
  }

  const updateFollowUp = (index: number, field: keyof FollowUpItem, value: number | string) => {
    setFollowUps((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const toggleDay = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      allowedDays: prev.allowedDays.includes(day)
        ? prev.allowedDays.filter((d) => d !== day)
        : [...prev.allowedDays, day],
    }))
  }

  const handleSave = async () => {
    if (!token) return
    setSaving(true)
    setMessage(null)
    try {
      await apiClient.put(
        '/api/profile',
        { locale, followUps, sendingSchedule: schedule },
        { token }
      )
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

  const dayKeys: Record<string, string> = {
    mon: 'dayMon',
    tue: 'dayTue',
    wed: 'dayWed',
    thu: 'dayThu',
    fri: 'dayFri',
    sat: 'daySat',
    sun: 'daySun',
  }

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
              <div className="mb-4">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-semibold">{t('followUpTitle')}</h2>
                  <span className="text-xs text-[var(--color-text-muted)] mt-1">
                    {t('followUpLimit', { max: maxFollowUps })}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{t('followUpSubtitle')}</p>
              </div>

              <div className="space-y-3">
                {followUps.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] px-4 py-3">
                    <span className="text-sm font-medium text-[var(--color-text-main)] w-24 shrink-0">
                      {t('followUp', { n: index + 1 })}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={item.delay}
                      onChange={(e) => updateFollowUp(index, 'delay', Math.max(1, Number(e.target.value) || 1))}
                      className="w-20 rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => updateFollowUp(index, 'unit', e.target.value)}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="days">{t('unitDays')}</option>
                      <option value="weeks">{t('unitWeeks')}</option>
                      <option value="months">{t('unitMonths')}</option>
                    </select>
                    {followUps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFollowUp(index)}
                        className="ml-auto text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors p-1 rounded"
                        title={t('removeFollowUp')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {followUps.length < maxFollowUps && (
                <button
                  type="button"
                  onClick={addFollowUp}
                  className="mt-3 flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {t('addFollowUp')}
                </button>
              )}
            </section>

            {/* Plages d'envoi */}
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">{t('sendingScheduleTitle')}</h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{t('sendingScheduleSubtitle')}</p>
              </div>

              {/* Jours autorisés */}
              <div className="mb-5">
                <label className="block text-sm font-medium mb-2">{t('allowedDays')}</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        schedule.allowedDays.includes(day)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-primary/40'
                      }`}
                    >
                      {t(dayKeys[day])}
                    </button>
                  ))}
                </div>
              </div>

              {/* Heures d'envoi */}
              <div className="mb-5">
                <label className="block text-sm font-medium mb-2">{t('allowedHours')}</label>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--color-text-muted)]">{t('hoursFrom')}</span>
                  <select
                    value={schedule.startHour}
                    onChange={(e) => setSchedule((prev) => ({ ...prev, startHour: Number(e.target.value) }))}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {QUARTER_HOURS.map((h) => {
                      const hrs = Math.floor(h)
                      const mins = Math.round((h - hrs) * 60)
                      return (
                        <option key={h} value={h}>{String(hrs).padStart(2, '0')}:{String(mins).padStart(2, '0')}</option>
                      )
                    })}
                  </select>
                  <span className="text-sm text-[var(--color-text-muted)]">{t('hoursTo')}</span>
                  <select
                    value={schedule.endHour}
                    onChange={(e) => setSchedule((prev) => ({ ...prev, endHour: Number(e.target.value) }))}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {QUARTER_HOURS.map((h) => {
                      const hrs = Math.floor(h)
                      const mins = Math.round((h - hrs) * 60)
                      return (
                        <option key={h} value={h}>{String(hrs).padStart(2, '0')}:{String(mins).padStart(2, '0')}</option>
                      )
                    })}
                  </select>
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium mb-2">{t('timezone')}</label>
                <select
                  value={schedule.timezone}
                  onChange={(e) => setSchedule((prev) => ({ ...prev, timezone: e.target.value }))}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full max-w-xs"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                  ))}
                </select>
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
              <StatusMessage type={message.type} message={message.text} />
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
