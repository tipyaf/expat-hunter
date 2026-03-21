'use client'

import { Lightbulb, X } from 'lucide-react'
import { useState } from 'react'

interface ProactiveTipProps {
  message: string
  cta?: { label: string; href: string }
  dismissible?: boolean
  variant?: 'info' | 'success' | 'warning'
}

const variantStyles = {
  info: 'bg-[var(--color-primary-light)] border-primary/20 text-primary',
  success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-300',
  warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300',
}

export function ProactiveTip({ message, cta, dismissible = true, variant = 'info' }: ProactiveTipProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className={`flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 ${variantStyles[variant]}`}>
      <Lightbulb className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 text-sm leading-relaxed">
        <p>{message}</p>
        {cta && (
          <a href={cta.href} className="mt-2 inline-block text-sm font-semibold underline underline-offset-2">
            {cta.label}
          </a>
        )}
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Fermer le conseil"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
