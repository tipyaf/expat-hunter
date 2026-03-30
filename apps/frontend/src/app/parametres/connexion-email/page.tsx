'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { useAuth } from '@/contexts/auth-context'
import { useEmailConnection, type EmailConnectionPayload } from '@/hooks/use-email-connection'
import { useTranslations } from 'next-intl'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { OAuthConnection } from './oauth-connection'
import { ManualConnection } from './manual-connection'

export default function EmailConnectionPage() {
  const { user } = useAuth()
  const t = useTranslations('emailConnection')
  const tc = useTranslations('common')
  const searchParams = useSearchParams()
  const router = useRouter()
  const oauthHandled = useRef(false)

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

  // Handle OAuth callback query params — run once only
  useEffect(() => {
    if (oauthHandled.current) return
    const oauth = searchParams.get('oauth')
    const reason = searchParams.get('reason')

    if (oauth === 'success') {
      oauthHandled.current = true
      setMessage({ text: t('oauthConnected'), type: 'success' })
      refresh()
      router.replace('/parametres/connexion-email')
    } else if (oauth === 'error') {
      oauthHandled.current = true
      const errorKey =
        reason === 'access_denied'
          ? 'oauthErrorAccessDenied'
          : reason === 'state_mismatch'
            ? 'oauthErrorStateMismatch'
            : 'oauthErrorGeneric'
      setMessage({ text: t(errorKey), type: 'error' })
      router.replace('/parametres/connexion-email')
    }
  }, [searchParams, t, refresh, router])

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
    } catch (error) {
      console.error('Failed to save email connection:', error)
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
    } catch (error) {
      console.error('Failed to disconnect email:', error)
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
    } catch (error) {
      console.error('Failed to delete email connection:', error)
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

              {/* OAuth section */}
              <OAuthConnection
                isOAuth={isOAuth}
                connection={connection ? { oauthEmail: connection.oauthEmail } : null}
                onConnect={connectWithGoogle}
                onDisconnect={() => void handleDisconnect()}
              />

              {/* Manual IMAP/SMTP */}
              <ManualConnection
                form={form}
                selectedProvider={selectedProvider}
                manualExpanded={manualExpanded}
                isSaving={isSaving}
                isTesting={isTesting}
                hasConnection={!!connection}
                isOAuth={isOAuth}
                onFormChange={setForm}
                onProviderChange={setSelectedProvider}
                onToggleExpanded={() => setManualExpanded((prev) => !prev)}
                onSave={() => void handleSave()}
                onTest={() => void handleTest()}
                onDelete={() => void handleDeleteManual()}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
