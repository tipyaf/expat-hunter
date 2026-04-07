'use client'

import { TagInput } from '@/components/ui/tag-input'
import { CountrySelect } from '@/components/ui/country-select'
import { PremiumBadge } from '@/components/ui/premium-badge'
import { usePlan } from '@/hooks/use-plan'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type {
  CreateJobSearchPayload,
  JobSearch,
  JobSearchSeniority,
  JobSearchFrequency,
  JobSearchPlatform,
} from '@/hooks/use-job-searches'

const SENIORITY_VALUES: readonly JobSearchSeniority[] = [
  'junior',
  'intermediate',
  'senior',
  'lead',
  'indifferent',
] as const

const SUPPORTED_PLATFORMS: readonly JobSearchPlatform[] = [
  'seek',
  'linkedin',
  'builtin',
  'zeil',
] as const

const FREQUENCY_VALUES: readonly JobSearchFrequency[] = [
  'manual',
  'weekly',
  'biweekly',
  'daily',
] as const

interface JobSearchFormProps {
  initialData?: JobSearch | null
  onSubmit: (data: CreateJobSearchPayload) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
}

const PREMIUM_FREQUENCIES: JobSearchFrequency[] = ['daily', 'biweekly']

export function JobSearchForm({ initialData, onSubmit, onCancel, isSubmitting }: JobSearchFormProps) {
  const t = useTranslations('jobSearch')
  const { isFree } = usePlan()

  const [roles, setRoles] = useState<string[]>(initialData?.roles ?? [])
  const [countries, setCountries] = useState<string[]>(initialData?.countries ?? [])
  const [cities, setCities] = useState<string[]>(initialData?.cities ?? [])
  const [platforms, setPlatforms] = useState<JobSearchPlatform[]>(initialData?.platforms ?? [])
  const [seniority, setSeniority] = useState<JobSearchSeniority>(initialData?.seniority ?? 'indifferent')
  const [sector, setSector] = useState(initialData?.sector ?? '')
  const [skills, setSkills] = useState<string[]>(initialData?.skills ?? [])
  const [salaryMin, setSalaryMin] = useState(initialData?.salaryMin?.toString() ?? '')
  const [salaryMax, setSalaryMax] = useState(initialData?.salaryMax?.toString() ?? '')
  const [frequency, setFrequency] = useState<JobSearchFrequency>(initialData?.frequency ?? 'manual')
  const [error, setError] = useState<string | null>(null)

  function togglePlatform(platform: JobSearchPlatform) {
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (roles.length === 0) {
      setError(t('errorRolesRequired'))
      return
    }
    if (countries.length === 0) {
      setError(t('errorCountriesRequired'))
      return
    }
    if (platforms.length === 0) {
      setError(t('errorPlatformsRequired'))
      return
    }

    const minVal = salaryMin ? Number(salaryMin) : undefined
    const maxVal = salaryMax ? Number(salaryMax) : undefined
    if (minVal != null && maxVal != null && minVal > maxVal) {
      setError(t('errorSalaryRange'))
      return
    }

    const data: CreateJobSearchPayload = {
      roles,
      countries,
      platforms,
      seniority,
      ...(cities.length > 0 && { cities }),
      ...(sector && { sector }),
      ...(skills.length > 0 && { skills }),
      ...(minVal != null && { salaryMin: minVal }),
      ...(maxVal != null && { salaryMax: maxVal }),
      frequency,
    }

    try {
      await onSubmit(data)
    } catch (err: any) {
      setError(err.message ?? t('errorGeneric'))
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      data-testid="job-search-form"
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6 shadow-sm space-y-5"
    >
      <h2 className="text-lg font-semibold text-[var(--color-text-main)]">
        {initialData ? t('editTitle') : t('createTitle')}
      </h2>

      {error && (
        <div data-testid="job-search-form-error" className="rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 px-4 py-3 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}

      {/* Roles */}
      <div data-testid="job-search-roles-input">
        <TagInput
          label={t('rolesLabel')}
          value={roles}
          onChange={setRoles}
          placeholder={t('rolesPlaceholder')}
          maxLength={100}
        />
      </div>

      {/* Countries */}
      <div data-testid="job-search-countries-input">
        <CountrySelect
          label={t('countriesLabel')}
          value={countries}
          onChange={setCountries}
        />
      </div>

      {/* Cities (optional) */}
      <div data-testid="job-search-cities-input">
        <TagInput
          label={t('citiesLabel')}
          value={cities}
          onChange={setCities}
          placeholder={t('citiesPlaceholder')}
        />
      </div>

      {/* Platforms */}
      <fieldset data-testid="job-search-platforms-input">
        <legend className="block text-sm font-medium mb-2">{t('platformsLabel')}</legend>
        <div className="flex flex-wrap gap-3">
          {SUPPORTED_PLATFORMS.map((platform) => (
            <label
              key={platform}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={platforms.includes(platform)}
                onChange={() => togglePlatform(platform)}
                className="h-4 w-4 rounded border-[var(--color-border)] text-primary focus:ring-primary"
              />
              <span className="text-sm capitalize">{platform}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Seniority */}
      <fieldset data-testid="job-search-seniority-input">
        <legend className="block text-sm font-medium mb-2">{t('seniorityLabel')}</legend>
        <div className="flex flex-wrap gap-3">
          {SENIORITY_VALUES.map((level) => (
            <label
              key={level}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="radio"
                name="seniority"
                value={level}
                checked={seniority === level}
                onChange={() => setSeniority(level)}
                className="h-4 w-4 border-[var(--color-border)] text-primary focus:ring-primary"
              />
              <span className="text-sm">{t(`seniority_${level}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Sector (optional) */}
      <div>
        <label htmlFor="sector" className="block text-sm font-medium mb-1">
          {t('sectorLabel')}
        </label>
        <input
          id="sector"
          type="text"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          placeholder={t('sectorPlaceholder')}
          maxLength={100}
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-transparent"
        />
      </div>

      {/* Skills (optional) */}
      <div data-testid="job-search-skills-input">
        <TagInput
          label={t('skillsLabel')}
          value={skills}
          onChange={setSkills}
          placeholder={t('skillsPlaceholder')}
          maxLength={100}
        />
      </div>

      {/* Salary range (optional) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="salaryMin" className="block text-sm font-medium mb-1">
            {t('salaryMinLabel')}
          </label>
          <input
            id="salaryMin"
            type="number"
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
            placeholder={t('salaryPlaceholder')}
            min={0}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-transparent"
          />
        </div>
        <div>
          <label htmlFor="salaryMax" className="block text-sm font-medium mb-1">
            {t('salaryMaxLabel')}
          </label>
          <input
            id="salaryMax"
            type="number"
            value={salaryMax}
            onChange={(e) => setSalaryMax(e.target.value)}
            placeholder={t('salaryPlaceholder')}
            min={0}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-transparent"
          />
        </div>
      </div>

      {/* Frequency */}
      <div data-testid="job-search-frequency-input">
        <label htmlFor="frequency" className="block text-sm font-medium mb-1">
          {t('frequencyLabel')}
        </label>
        <div className="relative">
          <select
            id="frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as JobSearchFrequency)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-light)] px-3 py-2 text-sm"
          >
            {FREQUENCY_VALUES.map((freq) => (
              <option
                key={freq}
                value={freq}
                disabled={isFree && PREMIUM_FREQUENCIES.includes(freq)}
              >
                {t(`frequency_${freq}`)}
                {isFree && PREMIUM_FREQUENCIES.includes(freq) ? ` (${t('premiumOnly')})` : ''}
              </option>
            ))}
          </select>
          {isFree && PREMIUM_FREQUENCIES.includes(frequency) && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <PremiumBadge size="sm" />
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          data-testid="job-search-submit-btn"
          className="rounded-[var(--radius-md)] bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? t('saving') : (initialData ? t('update') : t('create'))}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            data-testid="job-search-cancel-btn"
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-raised)]"
          >
            {t('cancel')}
          </button>
        )}
      </div>
    </form>
  )
}
