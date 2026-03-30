'use client'

import { PasswordInput } from '@/components/ui/password-input'
import type { EmailConnectionPayload } from '@/hooks/use-email-connection'
import { useTranslations } from 'next-intl'

const EMAIL_PROVIDERS = [
  { id: 'gmail', name: 'Gmail', imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 587 },
  { id: 'outlook', name: 'Outlook / Hotmail', imapHost: 'outlook.office365.com', imapPort: 993, smtpHost: 'smtp.office365.com', smtpPort: 587 },
  { id: 'yahoo', name: 'Yahoo', imapHost: 'imap.mail.yahoo.com', imapPort: 993, smtpHost: 'smtp.mail.yahoo.com', smtpPort: 587 },
  { id: 'custom', name: 'Custom', imapHost: '', imapPort: 993, smtpHost: '', smtpPort: 587 },
]

export interface ManualConnectionProps {
  form: EmailConnectionPayload
  selectedProvider: string
  manualExpanded: boolean
  isSaving: boolean
  isTesting: boolean
  hasConnection: boolean
  isOAuth: boolean
  onFormChange: (form: EmailConnectionPayload) => void
  onProviderChange: (providerId: string) => void
  onToggleExpanded: () => void
  onSave: () => void
  onTest: () => void
  onDelete: () => void
}

export function ManualConnection({
  form,
  selectedProvider,
  manualExpanded,
  isSaving,
  isTesting,
  hasConnection,
  isOAuth,
  onFormChange,
  onProviderChange,
  onToggleExpanded,
  onSave,
  onTest,
  onDelete,
}: ManualConnectionProps) {
  const t = useTranslations('emailConnection')
  const tc = useTranslations('common')

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)]">
      <button
        type="button"
        onClick={onToggleExpanded}
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
                    onProviderChange(provider.id)
                    onFormChange({
                      ...form,
                      imapHost: provider.imapHost,
                      imapPort: provider.imapPort,
                      smtpHost: provider.smtpHost,
                      smtpPort: provider.smtpPort,
                    })
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
                    onChange={(e) => onFormChange({ ...form, imapHost: e.target.value })}
                    placeholder="imap.gmail.com"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('port')}</label>
                  <input
                    type="number"
                    value={form.imapPort}
                    onChange={(e) => onFormChange({ ...form, imapPort: Number(e.target.value) })}
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
                  onChange={(e) => onFormChange({ ...form, imapUser: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('password')}</label>
                <PasswordInput
                  value={form.imapPassword}
                  onChange={(e) => onFormChange({ ...form, imapPassword: e.target.value })}
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
                    onChange={(e) => onFormChange({ ...form, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('port')}</label>
                  <input
                    type="number"
                    value={form.smtpPort}
                    onChange={(e) => onFormChange({ ...form, smtpPort: Number(e.target.value) })}
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
                  onChange={(e) => onFormChange({ ...form, smtpUser: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('password')}</label>
                <PasswordInput
                  value={form.smtpPassword}
                  onChange={(e) => onFormChange({ ...form, smtpPassword: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Manual actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={onTest}
              disabled={isTesting}
              className="inline-flex items-center justify-center rounded-lg font-medium transition-colors border border-[var(--color-border)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-light)] px-4 py-2 text-sm disabled:opacity-50"
            >
              {isTesting ? '...' : t('test')}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-lg font-medium transition-colors bg-primary text-white hover:bg-primary-hover px-6 py-2 text-sm disabled:opacity-50"
            >
              {isSaving ? tc('saving') : t('save')}
            </button>
            {hasConnection && !isOAuth && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center justify-center rounded-lg font-medium transition-colors text-[var(--color-error)] border border-[var(--color-error)]/30 hover:bg-[var(--color-error)]/10 px-4 py-2 text-sm"
              >
                {t('deleteConnection')}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
