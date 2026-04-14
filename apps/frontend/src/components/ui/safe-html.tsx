'use client'

import DOMPurify from 'dompurify'
import type { ReactNode } from 'react'

interface SafeHtmlProps {
  html: string | null
  className?: string
}

export function SafeHtml({ html, className }: SafeHtmlProps): ReactNode {
  if (!html) {
    return null
  }

  const sanitized = DOMPurify.sanitize(html)

  return (
    <div
      data-testid="safe-html"
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
