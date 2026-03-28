'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { PasswordInput } from '@/components/ui/password-input'
import { useAuth } from '@/contexts/auth-context'
import { useEmailConnection, type EmailConnectionPayload } from '@/hooks/use-email-connection'
import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const EMAIL_PROVIDERS = [
  { id: 'gmail', name: 'Gmail', imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 587 },
  { id: 'outlook', name: 'Outlook / Hotmail', imapHost: 'outlook.office365.com', imapPort: 993, smtpHost: 'smtp.office365.com', smtpPort: 587 },
  { id: 'yahoo', name: 'Yahoo', imapHost: 'imap.mail.yahoo.com', imapPort: 993, smtpHost: 'smtp.mail.yahoo.com', smtpPort: 587 },
  { id: 'custom', name: 'Custom', imapHost: '', imapPort: 993, smtpHost: '', smtpPort: 587 },
]

export default function EmailConnectionPage() {
  const { user } = useAuth()
  const t = useTranslations('emailConnection')
  const tc = useTranslations('common')
  const searchParams = useSearchParams()

  const {
    connection,
    isLoading,
    isSaving,
    isTesting,
    isOAuth,
    save,
    remove,
    disconnect,
    testConnection,
    connectWithGoogle,
    refresh,
  } = useEmailConnection()

  const [selectedProvider, setSelectedProvider] = useState<string>('custom')
  const [manualExpanded, setManualExpanded] = useState(false)

  const [form, setForm] = useState<EmailConnectionPayload>({
    imapHost: '',
    imapPort: 993,
    imapUser: '',
    imapPassword: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
  })

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Handle OAuth callback query params
  useEffect(() => {
    const oauth = searchParams.get('oauth')
    const reason = searchParams.get('reason')

    if (oauth === 'success') {
      setMessage({ text: t('oauthConnected'), type: 'success' })
      refresh()
    } else if (oauth === 'error') {
      const errorKey =
        reason === 'access_denied'
          ? 'oauthErrorAccessDenied'
          : reason === 'state_mismatch'
            ? 'oauthErrorStateMismatch'
            : 'oauthErrorGeneric'
      setMessage({ text: t(errorKey), type: 'error' })
    }
  }, [searchParams, t, refresh])

  useEffect(() => {
    if (connection && !isOAuth) {
      setForm({
        imapHost: connection.imapHost,
        imapPort: connection.imapPort,
        imapUser: connection.imapUser,
        imapPassword: connection.imapPassword,
        smtpHost: connection.smtpHost,
        smtpPort: connection.smtpPort,
        smtpUser: connection.smtpUser,
        smtpPassword: connection.smtpPassword,
      })
      setManualExpanded(true)
    }
  }, [connection, isOAuth])

  const handleSave = async () => {
    setMessage(null)
    try {
      await save(form)
      setMessage({ text: t('saved'), type: 'success' })
    } catch {
      setMessage({ text: t('saveError'), type: 'error' })
    }
  }

  const handleTest = async () => {
    setMessage(null)
    const result = await testConnection()
    setMessage({
      text: result.success ? t('testSuccess') : t('testError'),
      type: result.success ? 'success' : 'error',
    })
  }

  const handleDisconnect = async () => {
    if (!window.confirm(t('disconnectConfirm'))) return
    setMessage(null)
    try {
      await disconnect()
      setForm({
        imapHost: '',
        imapPort: 993,
        imapUser: '',
        imapPassword: '',
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
      })
      setMessage({ text: t('disconnected'), type: 'success' })
    } catch {
      setMessage({ text: t('saveError'), type: 'error' })
    }
  }

  const handleDeleteManual = async () => {
    setMessage(null)
    try {
      await remove()
      setForm({
        imapHost: '',
        imapPort: 993,
        imapUser: '',
        imapPassword: '',
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
      })
      setMessage({ text: t('saved'), type: 'success' })
    } catch {
      setMessage({ text: t('saveError'), type: 'error' })
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
          {isLoading ? (
            <p className="text-sm text-[var(--color-text-muted)] mt-4">{tc('loading')}</p>
          ) : (
            <div className="max-w-2xl space-y-6 mt-4">
              {/* Message */}
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

              {/* OAuth section — primary */}
              <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6">
                <h2 className="text-lg font-semibold mb-1">{t('oauthSection')}</h2>
                <p className="text-sm text-[var(--color-text-muted)] mb-4">{t('oauthDescription')}</p>

                {isOAuth && connection ? (
                  <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-light)] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-main)]">
                          {t('connectedAs')} <strong>{connection.oauthEmail}</strong>
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">{t('connectedVia')}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDisconnect()}
                      className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-error)] border border-[var(--color-error)]/30 hover:bg-[var(--color-error)]/10 transition-colors"
                    >
                      {t('disconnect')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={connectWithGoogle}
                    className="inline-flex items-center gap-3 rounded-lg bg-white border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {t('connectGoogle')}
                  </button>
                )}
              </section>

              {/* Manual IMAP/SMTP — collapsible */}
              <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)]">
                <button
                  type="button"
                  onClick={() => setManualExpanded((prev) => !prev)}
                  className="flex w-full items-center justify-between p-6 text-left"
                >
                  <div>
                    <h2 className="text-lg font-semibold">{t('manualSection')}</h2>
                    <p className="text-sm text-[var(--color-text-muted)]">{t('manualDescription')}</p>
                  </div>
                  <svg
                    className={`h-5 w-5 shrink-0 text-[var(--color-text-muted)] transition-transform ${manualExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {manualExpanded && (
                  <div className="border-t border-[var(--color-border)] px-6 pb-6 pt-4 space-y-5">
                    {/* Help */}
                    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-light)] p-4">
                      <h3 className="text-sm font-semibold text-[var(--color-text-main)] mb-2">{t('helpTitle')}</h3>
                      <div className="space-y-1 text-sm text-[var(--color-text-muted)]">
                        <p>{t('helpGmail')}</p>
                        <p>{t('helpOutlook')}</p>
                        <p>{t('helpGeneral')}</p>
                      </div>
                    </div>

                    {/* Provider presets */}
                    <div>
                      <h3 className="text-sm font-semibold mb-2">{t('providerLabel')}</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {EMAIL_PROVIDERS.map((provider) => (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => {
                              setSelectedProvider(provider.id)
                              setForm((prev) => ({
                                ...prev,
                                imapHost: provider.imapHost,
                                imapPort: provider.imapPort,
                                smtpHost: provider.smtpHost,
                                smtpPort: provider.smtpPort,
                              }))
                            }}
                            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors border ${
                              selectedProvider === provider.id
                                ? 'bg-primary text-white border-primary'
                                : 'border-[var(--color-border)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-light)]'
                            }`}
                          >
                            {provider.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* IMAP */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t('imapSection')}</h3>
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">{t('host')}</label>
                            <input
                              type="text"
                              value={form.imapHost}
                              onChange={(e) => setForm((p) => ({ ...p, imapHost: e.target.value }))}
                              placeholder="imap.gmail.com"
                              className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">{t('port')}</label>
                            <input
                              type="number"
                              value={form.imapPort}
                              onChange={(e) => setForm((p) => ({ ...p, imapPort: Number(e.target.value) }))}
                              placeholder="993"
                              className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">{t('user')}</label>
                          <input
                            type="text"
                            value={form.imapUser}
                            onChange={(e) => setForm((p) => ({ ...p, imapUser: e.target.value }))}
                            placeholder="you@example.com"
                            className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">{t('password')}</label>
                          <PasswordInput
                            value={form.imapPassword}
                            onChange={(e) => setForm((p) => ({ ...p, imapPassword: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SMTP */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3">{t('smtpSection')}</h3>
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">{t('host')}</label>
                            <input
                              type="text"
                              value={form.smtpHost}
                              onChange={(e) => setForm((p) => ({ ...p, smtpHost: e.target.value }))}
                              placeholder="smtp.gmail.com"
                              className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">{t('port')}</label>
                            <input
                              type="number"
                              value={form.smtpPort}
                              onChange={(e) => setForm((p) => ({ ...p, smtpPort: Number(e.target.value) }))}
                              placeholder="587"
                              className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">{t('user')}</label>
                          <input
                            type="text"
                            value={form.smtpUser}
                            onChange={(e) => setForm((p) => ({ ...p, smtpUser: e.target.value }))}
                            placeholder="you@example.com"
                            className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">{t('password')}</label>
                          <PasswordInput
                            value={form.smtpPassword}
                            onChange={(e) => setForm((p) => ({ ...p, smtpPassword: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Manual actions */}
                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => void handleTest()}
                        disabled={isTesting}
                        className="inline-flex items-center justify-center rounded-lg font-medium transition-colors border border-[var(--color-border)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-light)] px-4 py-2 text-sm disabled:opacity-50"
                      >
                        {isTesting ? '...' : t('test')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center rounded-lg font-medium transition-colors bg-primary text-white hover:bg-primary-hover px-6 py-2 text-sm disabled:opacity-50"
                      >
                        {isSaving ? tc('saving') : t('save')}
                      </button>
                      {connection && !isOAuth && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteManual()}
                          className="inline-flex items-center justify-center rounded-lg font-medium transition-colors text-[var(--color-error)] border border-[var(--color-error)]/30 hover:bg-[var(--color-error)]/10 px-4 py-2 text-sm"
                        >
                          {t('deleteConnection')}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
