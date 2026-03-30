'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { FileText, Sliders, ChevronRight, Ban, Mail, Plus, Trash2 } from 'lucide-react'

type DelayUnit = 'days' | 'weeks' | 'months'

export interface FollowUpItem {
  delay: number
  unit: DelayUnit
}

export interface SendingSchedule {
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

export interface SettingsSectionsProps {
  user: { email: string }
  locale: string
  followUps: FollowUpItem[]
  schedule: SendingSchedule
  maxFollowUps: number
  theme: ThemeOption
  onLocaleChange: (locale: string) => void
  onAddFollowUp: () => void
  onRemoveFollowUp: (index: number) => void
  onUpdateFollowUp: (index: number, field: keyof FollowUpItem, value: number | string) => void
  onToggleDay: (day: string) => void
  onScheduleChange: (schedule: SendingSchedule) => void
  onThemeChange: (theme: ThemeOption) => void
}

export function SettingsSections({
  user,
  locale,
  followUps,
  schedule,
  maxFollowUps,
  theme,
  onLocaleChange,
  onAddFollowUp,
  onRemoveFollowUp,
  onUpdateFollowUp,
  onToggleDay,
  onScheduleChange,
  onThemeChange,
}: SettingsSectionsProps) {
  const t = useTranslations('settings')
  const ta = useTranslations('auth')

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

  return (
    <>
      {/* Account */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6">
        <h2 className="text-lg font-semibold mb-4">{t('account')}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t('emailLabel')}</label>
            <p className="text-[var(--color-text-muted)]">{user.email}</p>
          </div>
        </div>
      </section>

      {/* Follow-up sequences */}
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
                onChange={(e) => onUpdateFollowUp(index, 'delay', Math.max(1, Number(e.target.value) || 1))}
                className="w-20 rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                value={item.unit}
                onChange={(e) => onUpdateFollowUp(index, 'unit', e.target.value)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="days">{t('unitDays')}</option>
                <option value="weeks">{t('unitWeeks')}</option>
                <option value="months">{t('unitMonths')}</option>
              </select>
              {followUps.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveFollowUp(index)}
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
            onClick={onAddFollowUp}
            className="mt-3 flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('addFollowUp')}
          </button>
        )}
      </section>

      {/* Sending schedule */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{t('sendingScheduleTitle')}</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">{t('sendingScheduleSubtitle')}</p>
        </div>

        {/* Allowed days */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-2">{t('allowedDays')}</label>
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => onToggleDay(day)}
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

        {/* Sending hours */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-2">{t('allowedHours')}</label>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-text-muted)]">{t('hoursFrom')}</span>
            <select
              value={schedule.startHour}
              onChange={(e) => onScheduleChange({ ...schedule, startHour: Number(e.target.value) })}
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
              onChange={(e) => onScheduleChange({ ...schedule, endHour: Number(e.target.value) })}
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
            onChange={(e) => onScheduleChange({ ...schedule, timezone: e.target.value })}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full max-w-xs"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Templates and presets shortcuts */}
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

      {/* Language */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6">
        <h2 className="text-lg font-semibold mb-4">{t('language')}</h2>
        <select
          value={locale}
          onChange={(e) => onLocaleChange(e.target.value)}
          aria-label={t('language')}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="fr">{ta('localeFr')}</option>
          <option value="en">{ta('localeEn')}</option>
        </select>
      </section>

      {/* Dark mode */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6">
        <h2 className="text-lg font-semibold mb-4">{t('darkMode')}</h2>
        <div className="flex gap-2 flex-wrap">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onThemeChange(opt.value)}
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
    </>
  )
}
