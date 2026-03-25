'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { MarketSnapshot } from '@/components/ui/market-snapshot'
import { SearchProgressModal } from '@/components/ui/search-progress-modal'
import { useAuth } from '@/contexts/auth-context'
import { useMarketSnapshot } from '@/hooks/use-market-snapshot'
import { useSearch, type SearchRun } from '@/hooks/use-search'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const COUNTRY_CODES = ['NZ', 'AU', 'CA', 'UK', 'US', 'SG', 'MY', 'PH', 'ID', 'TH', 'HK'] as const

function statusColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800'
    case 'scraping': case 'analyzing': case 'generating': case 'pending': return 'bg-blue-100 text-blue-800'
    case 'failed': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

export default function SearchPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { runs, isLoading, activeRun, launchSearch, getDefaults } = useSearch()
  const t = useTranslations('search')
  const tc = useTranslations('common')
  const router = useRouter()

  const [country, setCountry] = useState('NZ')
  const [sector, setSector] = useState('')
  const [isLaunching, setIsLaunching] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const launchButtonRef = useRef<HTMLButtonElement>(null)
  const prevActiveRunStatus = useRef<string | null>(null)

  const { snapshot, isLoading: snapshotLoading } = useMarketSnapshot(country, sector || null)

  // Pre-fill from profile defaults
  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const defaults = await getDefaults()
        if (defaults.country) setCountry(defaults.country)
        if (defaults.sector) setSector(defaults.sector)
      } catch {
        // Ignore errors, keep defaults
      }
    }
    void loadDefaults()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Open modal when a run becomes active
  useEffect(() => {
    if (activeRun) setShowModal(true)
  }, [activeRun])

  // Show toast notification when search completes and modal is closed
  useEffect(() => {
    if (!activeRun) return
    const prevStatus = prevActiveRunStatus.current
    prevActiveRunStatus.current = activeRun.status

    const justFinished = (activeRun.status === 'completed' || activeRun.status === 'failed')
      && prevStatus && prevStatus !== 'completed' && prevStatus !== 'failed'

    if (justFinished && !showModal) {
      if (activeRun.status === 'completed') {
        setToast({
          message: t('resultSummary', {
            contacts: activeRun.contactsFound,
            relevant: activeRun.contactsRelevant,
            emails: activeRun.emailsGenerated,
          }),
          type: 'success',
        })
      } else {
        setToast({ message: activeRun.errorMessage ?? t('searchFailed'), type: 'error' })
      }
    }
  }, [activeRun, showModal, t])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 8000)
    return () => clearTimeout(timer)
  }, [toast])

  const handleCloseModal = () => {
    setShowModal(false)
    launchButtonRef.current?.focus()
  }

  const handleRetry = () => {
    setShowModal(false)
    void handleLaunch()
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-text-muted)]">{tc('loading')}</p>
      </div>
    )
  }

  const handleLaunch = async () => {
    setIsLaunching(true)
    setShowModal(true)
    try {
      await launchSearch(country, sector || undefined)
    } catch (err) {
      // Error is visible in the modal via activeRun.status === 'failed'
      console.error('Search launch error:', err)
    } finally {
      setIsLaunching(false)
    }
  }

  const isRunActive = activeRun && activeRun.status !== 'completed' && activeRun.status !== 'failed'

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] max-w-sm rounded-lg px-4 py-3 shadow-lg border transition-all duration-300 ${
          toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-start gap-2">
            <p className="text-sm flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-current opacity-50 hover:opacity-100 shrink-0"
            >
              ✕
            </button>
          </div>
          {toast.type === 'success' && (
            <button
              type="button"
              onClick={() => { setToast(null); setShowModal(true) }}
              className="text-xs text-primary font-medium mt-1 hover:underline"
            >
              {t('viewEmails')} →
            </button>
          )}
        </div>
      )}

      {showModal && (
        <SearchProgressModal
          open={showModal}
          country={country}
          sector={sector || null}
          status={activeRun?.status ?? 'pending'}
          currentStep={activeRun?.currentStep ?? null}
          progressPercent={activeRun?.progressPercent ?? 0}
          contactsFound={activeRun?.contactsFound ?? 0}
          contactsRelevant={activeRun?.contactsRelevant ?? 0}
          emailsGenerated={activeRun?.emailsGenerated ?? 0}
          contactsExcludedCooldown={activeRun?.contactsExcludedCooldown ?? 0}
          errorMessage={activeRun?.errorMessage ?? null}
          onClose={handleCloseModal}
          onRetry={handleRetry}
          onViewEmails={() => router.push(activeRun?.emailsGenerated ? '/emails' : '/contacts')}
        />
      )}
      <Sidebar />
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 md:px-8 pt-8 pb-4 pl-16 md:pl-8 bg-[var(--color-bg-light)]">
          <h1 className="text-3xl font-bold text-primary mb-2">{t('title')}</h1>
          <p className="text-[var(--color-text-muted)]">{t('subtitle')}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 space-y-6">
          {/* Market Snapshot */}
          <MarketSnapshot snapshot={snapshot} isLoading={snapshotLoading} />

          {/* Launch form */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6 shadow-sm">
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
                  ref={launchButtonRef}
                  type="button"
                  onClick={() => void handleLaunch()}
                  disabled={isLaunching || !!isRunActive}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLaunching ? t('launching') : t('launchButton')}
                </button>
              </div>
            </div>
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
                      <th className="text-left py-2 pr-4 font-medium">{t('colRelevant')}</th>
                      <th className="text-left py-2 pr-4 font-medium">{t('colEmails')}</th>
                      <th className="text-left py-2 pr-4 font-medium">{t('colExcluded')}</th>
                      <th className="text-left py-2 font-medium">{t('colDate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run: SearchRun) => (
                      <tr key={run.id} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="py-2 pr-4">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(run.status)}`}>
                            {t(`status_${run.status}`)}
                          </span>
                        </td>
                        <td className="py-2 pr-4">{run.country}</td>
                        <td className="py-2 pr-4">{run.sector ?? '-'}</td>
                        <td className="py-2 pr-4 font-medium">{run.contactsFound}</td>
                        <td className="py-2 pr-4 font-medium">{run.contactsRelevant}</td>
                        <td className="py-2 pr-4 font-medium">{run.emailsGenerated}</td>
                        <td className="py-2 pr-4 text-[var(--color-text-muted)]">
                          {run.contactsExcludedCooldown > 0 ? run.contactsExcludedCooldown : '-'}
                        </td>
                        <td className="py-2 text-[var(--color-text-muted)]">
                          {formatDate(run.createdAt)}
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
