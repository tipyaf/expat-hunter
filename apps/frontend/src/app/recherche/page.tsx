'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/contexts/auth-context'
import { useSourcing, type SourcingRun } from '@/hooks/use-sourcing'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

const COUNTRY_CODES = ['NZ', 'AU', 'SG', 'MY', 'PH', 'ID', 'TH', 'HK'] as const

function statusColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800'
    case 'running': case 'pending': return 'bg-blue-100 text-blue-800'
    case 'failed': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

export default function SourcingPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { runs, isLoading, launchRun } = useSourcing()
  const t = useTranslations('sourcing')
  const tc = useTranslations('common')

  const [country, setCountry] = useState('NZ')
  const [sector, setSector] = useState('')
  const [isLaunching, setIsLaunching] = useState(false)
  const [launchResult, setLaunchResult] = useState<string | null>(null)
  const [launchError, setLaunchError] = useState<string | null>(null)

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-text-muted)]">{tc('loading')}</p>
      </div>
    )
  }

  const handleLaunch = async () => {
    setIsLaunching(true)
    setLaunchResult(null)
    setLaunchError(null)
    try {
      const res = await launchRun(country, sector || undefined)
      setLaunchResult(res.message)
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : tc('genericError'))
    } finally {
      setIsLaunching(false)
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 md:px-8 pt-8 pb-4 pl-16 md:pl-8 bg-[var(--color-bg-light)]">
          <h1 className="text-3xl font-bold text-primary mb-2">{t('title')}</h1>
          <p className="text-[var(--color-text-muted)]">{t('subtitle')}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8">
        {/* Launch form */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6 shadow-sm mb-8">
          <h2 className="text-lg font-semibold mb-4">{t('launchTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="country" className="block text-sm font-medium mb-1">
                {t('countryLabel')}
              </label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-2 text-sm"
              >
                {COUNTRY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {t(`country_${code}`)} ({code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sector" className="block text-sm font-medium mb-1">
                {t('sectorLabel')}
              </label>
              <input
                id="sector"
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder={t('sectorPlaceholder')}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void handleLaunch()}
                disabled={isLaunching}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isLaunching ? t('launching') : t('launchButton')}
              </button>
            </div>
          </div>

          {launchResult && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
              {launchResult}
            </div>
          )}
          {launchError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {launchError}
            </div>
          )}
        </div>

        {/* Runs history */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{t('historyTitle')}</h2>

          {isLoading ? (
            <p className="text-sm text-[var(--color-text-muted)]">{tc('loading')}</p>
          ) : runs.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">{t('noRuns')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 pr-4 font-medium">{t('colStatus')}</th>
                    <th className="text-left py-2 pr-4 font-medium">{t('colCountry')}</th>
                    <th className="text-left py-2 pr-4 font-medium">{t('colSector')}</th>
                    <th className="text-left py-2 pr-4 font-medium">{t('colContacts')}</th>
                    <th className="text-left py-2 pr-4 font-medium">{t('colSources')}</th>
                    <th className="text-left py-2 pr-4 font-medium">{t('colDate')}</th>
                    <th className="text-left py-2 font-medium">{t('colErrors')}</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run: SourcingRun) => (
                    <tr key={run.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="py-2 pr-4">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(run.status)}`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{run.country}</td>
                      <td className="py-2 pr-4">{run.sector ?? '-'}</td>
                      <td className="py-2 pr-4 font-medium">{run.contactsFound}</td>
                      <td className="py-2 pr-4">{run.sources.join(', ')}</td>
                      <td className="py-2 pr-4 text-[var(--color-text-muted)]">
                        {formatDate(run.createdAt)}
                      </td>
                      <td className="py-2">
                        {run.errors ? (
                          <span className="text-xs text-red-600">
                            {Object.values(run.errors).join('; ')}
                          </span>
                        ) : (
                          <span className="text-xs text-green-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </main>
    </div>
  )
}
