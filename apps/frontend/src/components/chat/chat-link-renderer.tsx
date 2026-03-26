'use client'

import Link from 'next/link'
import type { AnchorHTMLAttributes } from 'react'

const ALLOWED_PREFIXES = ['/', 'http://', 'https://']

const LINK_CLASS = 'underline text-primary hover:opacity-80'

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string }

export function ChatLinkRenderer({ href, children, ...props }: Props) {
  if (!href) return <span>{children}</span>

  // Security: reject javascript: and data: URIs — only allow /, http://, https://
  const isAllowed = ALLOWED_PREFIXES.some((prefix) => href.startsWith(prefix))
  if (!isAllowed) return <span>{children}</span>

  // Internal paths use Next.js Link for client-side navigation
  if (href.startsWith('/')) {
    return (
      <Link href={href} className={LINK_CLASS}>
        {children}
      </Link>
    )
  }

  // External URLs open in new tab with security attributes
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS} {...props}>
      {children}
    </a>
  )
}
