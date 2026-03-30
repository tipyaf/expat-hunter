'use client'

import { useTranslations } from 'next-intl'

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const tErrors = useTranslations('errors')
  const tc = useTranslations('common')

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">{tErrors('searchPage')}</h2>
        <p className="text-sm text-gray-600 mb-4">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          {tc('retry')}
        </button>
      </div>
    </div>
  )
}
