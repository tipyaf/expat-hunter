'use client'

import { usePlan } from '@/hooks/use-plan'
import { PremiumBadge } from '@/components/ui/premium-badge'
import { Crown } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

interface PremiumGateProps {
  children: ReactNode
  fallback?: ReactNode
}

export function PremiumGate({ children, fallback }: PremiumGateProps) {
  const { isPremium } = usePlan()
  const t = useTranslations('premium')

  if (isPremium) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="pointer-events-none select-none opacity-40 blur-[2px]" aria-hidden="true">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-surface-light)]/80 backdrop-blur-sm rounded-[var(--radius-lg)]">
        <div className="flex flex-col items-center gap-4 p-8 text-center max-w-md">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
            <Crown className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text-main)]">
            {t('gateTitle')}
          </h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            {t('gateDescription')}
          </p>
          <Link
            href="/upgrade"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-shadow"
          >
            <Crown className="h-4 w-4" />
            {t('upgradeCta')}
          </Link>
        </div>
      </div>
    </div>
  )
}
