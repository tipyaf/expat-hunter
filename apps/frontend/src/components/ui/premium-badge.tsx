'use client'

import { Crown } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface PremiumBadgeProps {
  size?: 'sm' | 'md'
  className?: string
}

export function PremiumBadge({ size = 'sm', className = '' }: PremiumBadgeProps) {
  const t = useTranslations('premium')

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[11px] gap-1'
    : 'px-3 py-1 text-xs gap-1.5'

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'

  return (
    <span
      className={`inline-flex items-center ${sizeClasses} rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold shadow-sm ${className}`}
      title={t('badgeTooltip')}
    >
      <Crown className={iconSize} aria-hidden="true" />
      {t('badge')}
    </span>
  )
}
