'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { TagInput } from '@/components/ui/tag-input'
import { useAuth } from '@/contexts/auth-context'
import { type UpdateProfileData, useProfile } from '@/hooks/use-profile'
import { useRouter } from 'next/navigation'
import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth()
  const { profile, isLoading: profileLoading, updateProfile, uploadCv } = useProfile()
  const router = useRouter()
  const t = useTranslations('profile')
  const tc = useTranslations('common')

  const [skills, setSkills] = useState<string[]>([])
  const [experienceYears, setExperienceYears] = useState(0)
  const [targetCountries, setTargetCountries] = useState<string[]>([])
  const [targetSectors, setTargetSectors] = useState<string[]>([])
  const [targetRoles, setTargetRoles] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) {
      setSkills(profile.skills)
      setExperienceYears(profile.experienceYears)
      setTargetCountries(profile.targetCountries)
      setTargetSectors(profile.targetSectors)
      setTargetRoles(profile.targetRoles)
    }
  }, [profile])

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setError('')
      setMessage('')
      setIsSaving(true)

      try {
        const data: UpdateProfileData = {
          skills,
          experienceYears,
          targetCountries,
          targetSectors,
          targetRoles,
        }
        await updateProfile(data)
        setMessage(t('saveSuccess'))
        setTimeout(() => {
          setMessage('')
        }, 3000)
      } catch {
        setError(t('saveError'))
      } finally {
        setIsSaving(false)
      }
    },
    [skills, experienceYears, targetCountries, targetSectors, targetRoles, updateProfile, t],
  )

  const handleCvUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) {
        return
      }
      setError('')
      setIsSaving(true)

      try {
        await uploadCv(file)
        setMessage(t('cvUploadSuccess'))
        setTimeout(() => {
          setMessage('')
        }, 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('cvUploadError'))
      } finally {
        setIsSaving(false)
      }
    },
    [uploadCv, t],
  )

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

  if (!profile?.onboardingCompleted) {
    router.push('/profile/setup')
    return null
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-primary mb-2">{t('title')}</h1>
        <p className="text-[var(--color-text-muted)] mb-8">
          {t('subtitle')}
        </p>

        {message && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 px-4 py-3 text-sm text-[var(--color-error)]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
            <TagInput
              label={t('skillsLabel')}
              value={skills}
              onChange={setSkills}
              placeholder="TypeScript, React, Node.js..."
            />

            <div>
              <label htmlFor="experienceYears" className="block text-sm font-medium mb-1">
                {t('experienceLabel')}
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
              label={t('targetSectorsLabel')}
              value={targetSectors}
              onChange={setTargetSectors}
              placeholder="Tech, Finance, SaaS..."
            />

            <TagInput
              label={t('targetRolesLabel')}
              value={targetRoles}
              onChange={setTargetRoles}
              placeholder="Backend Developer, CTO..."
            />

            <div className="pt-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? tc('saving') : tc('save')}
              </Button>
            </div>
          </form>

          {/* CV section */}
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6">
              <h2 className="text-lg font-semibold mb-4">{t('cvTitle')}</h2>
              {profile.cvFilePath ? (
                <p className="text-sm text-primary font-medium mb-4">{t('cvSaved')}</p>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)] mb-4">{t('cvNone')}</p>
              )}
              <label
                htmlFor="cv-reupload"
                className="inline-flex cursor-pointer items-center rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-primary/5 transition-colors"
              >
                {profile.cvFilePath ? t('cvReplace') : t('cvUpload')}
                <input
                  id="cv-reupload"
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleCvUpload}
                  className="hidden"
                />
              </label>
            </div>

            {profile.cvText && (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-6">
                <h3 className="text-sm font-semibold mb-2">{t('cvExtractedText')}</h3>
                <p className="text-xs text-[var(--color-text-muted)] whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {profile.cvText}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
