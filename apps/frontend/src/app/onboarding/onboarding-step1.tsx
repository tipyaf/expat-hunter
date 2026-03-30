'use client'

import { Button } from '@/components/ui/button'
import { CountrySelect } from '@/components/ui/country-select'
import { TagInput } from '@/components/ui/tag-input'
import type { FormEvent } from 'react'
import { useTranslations } from 'next-intl'

interface OnboardingStep1Props {
  fullName: string
  targetCountries: string[]
  targetSectors: string[]
  targetRoles: string[]
  isSubmitting: boolean
  error: string
  onFullNameChange: (value: string) => void
  onTargetCountriesChange: (value: string[]) => void
  onTargetSectorsChange: (value: string[]) => void
  onTargetRolesChange: (value: string[]) => void
  onSubmit: (e: FormEvent) => void
}

export function OnboardingStep1({
  fullName,
  targetCountries,
  targetSectors,
  targetRoles,
  isSubmitting,
  error,
  onFullNameChange,
  onTargetCountriesChange,
  onTargetSectorsChange,
  onTargetRolesChange,
  onSubmit,
}: OnboardingStep1Props) {
  const t = useTranslations('onboarding')
  const tc = useTranslations('common')

  return (
    <form
      onSubmit={onSubmit}
      className="bg-[var(--color-surface-light)] rounded-xl border border-[var(--color-border)] p-6 space-y-5"
    >
      <h2 className="text-xl font-semibold">{t('step1Title')}</h2>

      <div>
        <label htmlFor="fullName" className="block text-sm font-medium mb-1">
          {t('fullName')}
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => onFullNameChange(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          placeholder="Jean Dupont"
        />
      </div>

      <CountrySelect
        label={t('targetCountries')}
        value={targetCountries}
        onChange={onTargetCountriesChange}
      />

      <TagInput
        label={t('targetSectors')}
        value={targetSectors}
        onChange={onTargetSectorsChange}
        placeholder="Tech, Finance..."
      />

      <TagInput
        label={t('targetRoles')}
        value={targetRoles}
        onChange={onTargetRolesChange}
        placeholder="Backend Developer, CTO..."
      />

      {error && (
        <p className="text-sm text-[var(--color-error)]">{error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? tc('saving') : t('next')}
        </Button>
      </div>
    </form>
  )
}
