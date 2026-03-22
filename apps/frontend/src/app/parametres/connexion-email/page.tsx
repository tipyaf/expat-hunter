'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/contexts/auth-context'
import { useEmailConnection, type EmailConnectionPayload } from '@/hooks/use-email-connection'
import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'

export default function EmailConnectionPage() {
  const { user } = useAuth()
  const t = useTranslations('emailConnection')
  const tc = useTranslations('common')

  const { connection, isLoading, isSaving, isTesting, save, remove, testConnection } = useEmailConnection()

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

  useEffect(() => {
    if (connection) {
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
    }
  }, [connection])

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

  const handleDelete = async () => {
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
              {/* IMAP Section */}
              <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6">
                <h2 className="text-lg font-semibold mb-4">{t('imapSection')}</h2>
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
                    <input
                      type="password"
                      value={form.imapPassword}
                      onChange={(e) => setForm((p) => ({ ...p, imapPassword: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </section>

              {/* SMTP Section */}
              <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6">
                <h2 className="text-lg font-semibold mb-4">{t('smtpSection')}</h2>
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
                    <input
                      type="password"
                      value={form.smtpPassword}
                      onChange={(e) => setForm((p) => ({ ...p, smtpPassword: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </section>

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

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
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
                {connection && (
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    className="inline-flex items-center justify-center rounded-lg font-medium transition-colors text-[var(--color-error)] border border-[var(--color-error)]/30 hover:bg-[var(--color-error)]/10 px-4 py-2 text-sm"
                  >
                    {t('deleteConnection')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
