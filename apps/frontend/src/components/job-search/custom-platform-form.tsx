'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface CustomPlatformFormProps {
  onAdd: (name: string, url: string) => Promise<void>
  isSubmitting?: boolean
}

export function CustomPlatformForm({ onAdd, isSubmitting }: Readonly<CustomPlatformFormProps>) {
  const t = useTranslations('customPlatforms')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const isValid = name.trim().length > 0 && url.trim().length > 0

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError('')

    // Client-side URL validation (http/https only)
    if (!/^https?:\/\/.+/.test(url.trim())) {
      setError(t('errorInvalidUrl'))
      return
    }

    try {
      await onAdd(name.trim(), url.trim())
      setName('')
      setUrl('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('DUPLICATE') || message.includes('already exists')) {
        setError(t('errorDuplicate'))
      } else {
        setError(t('errorGeneric'))
      }
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      data-testid="custom-platform-form"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('namePlaceholder')}
          data-testid="custom-platform-name-input"
          className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-light)] px-3 py-2 text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('urlPlaceholder')}
          data-testid="custom-platform-url-input"
          className="flex-[2] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-light)] px-3 py-2 text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          data-testid="custom-platform-add-btn"
          className="flex items-center gap-2 rounded-[var(--radius-md)] bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {isSubmitting ? t('adding') : t('add')}
        </button>
      </div>
      {error && (
        <p data-testid="custom-platform-error" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}
    </form>
  )
}
