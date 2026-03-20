'use client'

import { Button } from '@/components/ui/button'
import { TagInput } from '@/components/ui/tag-input'
import { useAuth } from '@/contexts/auth-context'
import { type UpdateProfileData, useProfile } from '@/hooks/use-profile'
import { useRouter } from 'next/navigation'
import { type ChangeEvent, type FormEvent, useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'

type WizardStep = 'info' | 'cv' | 'confirm'

export default function ProfileSetupPage() {
  const { user, isLoading: authLoading } = useAuth()
  const {
    profile,
    isLoading: profileLoading,
    updateProfile,
    uploadCv,
    completeOnboarding,
  } = useProfile()
  const router = useRouter()
  const t = useTranslations('profile.setup')
  const tp = useTranslations('profile')
  const tc = useTranslations('common')

  const steps: { key: WizardStep; label: string; number: number }[] = [
    { key: 'info', label: t('stepInfo'), number: 1 },
    { key: 'cv', label: t('stepCv'), number: 2 },
    { key: 'confirm', label: t('stepConfirm'), number: 3 },
  ]

  const [step, setStep] = useState<WizardStep>('info')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? [])
  const [experienceYears, setExperienceYears] = useState(profile?.experienceYears ?? 0)
  const [targetCountries, setTargetCountries] = useState<string[]>(profile?.targetCountries ?? [])
  const [targetSectors, setTargetSectors] = useState<string[]>(profile?.targetSectors ?? [])
  const [targetRoles, setTargetRoles] = useState<string[]>(profile?.targetRoles ?? [])
  const [cvFile, setCvFile] = useState<File | null>(null)

  const handleSaveInfo = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setError('')
      setIsSaving(true)

      if (skills.length === 0) {
        setError(t('skillsRequired'))
        setIsSaving(false)
        return
      }
      if (targetCountries.length === 0) {
        setError(t('countriesRequired'))
        setIsSaving(false)
        return
      }

      try {
        const data: UpdateProfileData = {
          skills,
          experienceYears,
          targetCountries,
          targetSectors,
          targetRoles,
        }
        await updateProfile(data)
        setStep('cv')
      } catch {
        setError(t('saveError'))
      } finally {
        setIsSaving(false)
      }
    },
    [skills, experienceYears, targetCountries, targetSectors, targetRoles, updateProfile, t],
  )

  const handleCvUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) {
        return
      }
      setCvFile(file)
      setError('')
      setIsSaving(true)

      try {
        await uploadCv(file)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('cvUploadError'))
        setCvFile(null)
      } finally {
        setIsSaving(false)
      }
    },
    [uploadCv, t],
  )

  const handleComplete = useCallback(async () => {
    setError('')
    setIsSaving(true)

    try {
      await completeOnboarding()
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('finalizingError'))
    } finally {
      setIsSaving(false)
    }
  }, [completeOnboarding, router, t])

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-text-muted)]">{tc('loading')}</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (profile?.onboardingCompleted) {
    router.push('/')
    return null
  }

  const currentStepIndex = steps.findIndex((s) => s.key === step)

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-light)] p-4">
      <div className="w-full max-w-2xl rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2 text-primary">
          {t('title')}
        </h1>
        <p className="text-center text-[var(--color-text-muted)] mb-8">
          {t('welcome', { name: user.fullName })}
        </p>

        {/* Progress bar */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  i <= currentStepIndex
                    ? 'bg-primary text-white'
                    : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
                }`}
              >
                {s.number}
              </div>
              <span
                className={`text-sm ${
                  i <= currentStepIndex
                    ? 'text-primary font-medium'
                    : 'text-[var(--color-text-muted)]'
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`h-0.5 w-8 ${
                    i < currentStepIndex ? 'bg-primary' : 'bg-[var(--color-border)]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 px-4 py-3 text-sm text-[var(--color-error)]">
            {error}
          </div>
        )}

        {/* Step 1: Info */}
        {step === 'info' && (
          <form onSubmit={handleSaveInfo} className="space-y-5">
            <TagInput
              label={tp('skillsLabel')}
              value={skills}
              onChange={setSkills}
              placeholder="TypeScript, React, Node.js..."
            />

            <div>
              <label htmlFor="experienceYears" className="block text-sm font-medium mb-1">
                {tp('experienceLabel')}
              </label>
              <input
                id="experienceYears"
                type="number"
                min={0}
                max={50}
                value={experienceYears}
                onChange={(e) => {
                  setExperienceYears(Number.parseInt(e.target.value, 10) || 0)
                }}
                className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <TagInput
              label={t('targetCountriesLabel')}
              value={targetCountries}
              onChange={setTargetCountries}
              placeholder="NZ, AU, CA..."
              maxLength={3}
            />

            <TagInput
              label={tp('targetSectorsLabel')}
              value={targetSectors}
              onChange={setTargetSectors}
              placeholder="Tech, Finance, SaaS..."
            />

            <TagInput
              label={tp('targetRolesLabel')}
              value={targetRoles}
              onChange={setTargetRoles}
              placeholder="Backend Developer, CTO..."
            />

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? tc('saving') : tc('next')}
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: CV */}
        {step === 'cv' && (
          <div className="space-y-6">
            <div className="rounded-lg border-2 border-dashed border-[var(--color-border)] p-8 text-center">
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                {t('cvUploadPrompt')}
              </p>
              <label
                htmlFor="cv-upload"
                className="inline-flex cursor-pointer items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
              >
                {cvFile ? cvFile.name : t('chooseFile')}
                <input
                  id="cv-upload"
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleCvUpload}
                  className="hidden"
                />
              </label>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">{t('cvFileHint')}</p>
              {cvFile && (
                <p className="mt-2 text-sm text-primary font-medium">{t('cvUploadSuccess')}</p>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('info')
                }}
              >
                {tc('previous')}
              </Button>
              <Button
                onClick={() => {
                  setStep('confirm')
                }}
              >
                {cvFile ? tc('next') : t('skipStep')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-6">
              <h3 className="text-lg font-semibold mb-4">{t('summaryTitle')}</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-muted)]">{t('summarySkills')}</dt>
                  <dd className="font-medium">
                    {skills.length > 0 ? skills.join(', ') : tc('noneF')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-muted)]">{t('summaryExperience')}</dt>
                  <dd className="font-medium">{experienceYears} {tc('years')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-muted)]">{t('summaryCountries')}</dt>
                  <dd className="font-medium">
                    {targetCountries.length > 0 ? targetCountries.join(', ') : tc('none')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-muted)]">{t('summarySectors')}</dt>
                  <dd className="font-medium">
                    {targetSectors.length > 0 ? targetSectors.join(', ') : tc('none')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-muted)]">{t('summaryRoles')}</dt>
                  <dd className="font-medium">
                    {targetRoles.length > 0 ? targetRoles.join(', ') : tc('none')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-muted)]">{t('summaryCv')}</dt>
                  <dd className="font-medium">{cvFile ? cvFile.name : tc('notProvided')}</dd>
                </div>
              </dl>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('cv')
                }}
              >
                {tc('previous')}
              </Button>
              <Button onClick={handleComplete} disabled={isSaving}>
                {isSaving ? t('finalizing') : t('complete')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
