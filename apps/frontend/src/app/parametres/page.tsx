'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/contexts/auth-context'
import { useTheme } from '@/contexts/theme-context'
import { useSendingSettings } from '@/hooks/use-sending-settings'
import { apiClient } from '@/lib/api-client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { setLocaleAction } from '@/app/actions/locale'
import { SettingsSections, type FollowUpItem, type SendingSchedule } from './settings-sections'

export default function SettingsPage() {
  const { user, token } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const t = useTranslations('settings')
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
      .catch((error) => { console.error('Failed to fetch profile settings:', error) })
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
      await setLocaleAction(locale)
      setMessage({ text: t('saveSuccess'), type: 'success' })
      router.refresh()
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage({ text: t('saveError'), type: 'error' })
    } finally {
      setSaving(false)
    }
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
            <SettingsSections
              user={{ email: user.email }}
              locale={locale}
              followUps={followUps}
              schedule={schedule}
              maxFollowUps={maxFollowUps}
              theme={theme}
              onLocaleChange={setLocale}
              onAddFollowUp={addFollowUp}
              onRemoveFollowUp={removeFollowUp}
              onUpdateFollowUp={updateFollowUp}
              onToggleDay={toggleDay}
              onScheduleChange={setSchedule}
              onThemeChange={setTheme}
            />

            {/* Message + Save button */}
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
