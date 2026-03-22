'use client'

import { Button } from '@/components/ui/button'
import { TagInput } from '@/components/ui/tag-input'
import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useProfile } from '@/hooks/use-profile'
import { useRouter } from 'next/navigation'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

interface OnboardingStepResponse {
  step: number
  completed: boolean
  profile?: {
    skills: string[]
    experienceYears: number
    targetCountries: string[]
    targetSectors: string[]
    targetRoles: string[]
    onboardingCompleted: boolean
  }
}

interface RefineResponse {
  message: string
  suggestedUpdates?: Record<string, unknown>
}

interface RefineMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function OnboardingPage() {
  const { user, token, isLoading: authLoading } = useAuth()
  const { profile, isLoading: profileLoading, uploadCv, refetch } = useProfile()
  const router = useRouter()
  const t = useTranslations('onboarding')
  const tc = useTranslations('common')

  const [currentStep, setCurrentStep] = useState(1)
  const TOTAL_STEPS = 3

  // Step 1 state
  const [fullName, setFullName] = useState('')
  const [targetCountries, setTargetCountries] = useState<string[]>([])
  const [targetSectors, setTargetSectors] = useState<string[]>([])
  const [targetRoles, setTargetRoles] = useState<string[]>([])

  // Step 3 state
  const [experienceYears, setExperienceYears] = useState(0)
  const [skills, setSkills] = useState<string[]>([])

  // CV state
  const [cvUploading, setCvUploading] = useState(false)
  const [cvMessage, setCvMessage] = useState('')
  const hasCv = Boolean(profile?.cvText)

  // Refine chat state
  const [refineMessages, setRefineMessages] = useState<RefineMessage[]>([])
  const [refineInput, setRefineInput] = useState('')
  const [refineSending, setRefineSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Pre-fill from existing profile
  useEffect(() => {
    if (profile) {
      setSkills(profile.skills)
      setExperienceYears(profile.experienceYears)
      setTargetCountries(profile.targetCountries)
      setTargetSectors(profile.targetSectors)
      setTargetRoles(profile.targetRoles)
    }
  }, [profile])

  useEffect(() => {
    if (user) {
      setFullName(user.fullName ?? '')
    }
  }, [user])

  // Redirect if already onboarded
  useEffect(() => {
    if (!authLoading && !profileLoading && profile?.onboardingCompleted) {
      router.replace('/')
    }
  }, [authLoading, profileLoading, profile, router])

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [refineMessages])

  const handleCvUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setCvUploading(true)
      setCvMessage('')
      try {
        const result = await uploadCv(file)
        if (result?.aiExtraction && result.profile) {
          if (result.profile.skills.length > 0) setSkills(result.profile.skills)
          if (result.profile.targetRoles.length > 0) setTargetRoles(result.profile.targetRoles)
          if (result.profile.targetSectors.length > 0) setTargetSectors(result.profile.targetSectors)
          if (result.profile.experienceYears > 0) setExperienceYears(result.profile.experienceYears)
        }
        setCvMessage(t('cvParsed'))
      } catch (err) {
        setCvMessage(err instanceof Error ? err.message : tc('genericError'))
      } finally {
        setCvUploading(false)
      }
    },
    [uploadCv, t, tc],
  )

  const handleStep1 = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!token) return
      setError('')
      setIsSubmitting(true)
      try {
        await apiClient.post<OnboardingStepResponse>(
          '/api/onboarding',
          {
            step: 1,
            data: { fullName, targetCountries, targetSectors, targetRoles },
          },
          { token },
        )
        setCurrentStep(2)
      } catch {
        setError(tc('genericError'))
      } finally {
        setIsSubmitting(false)
      }
    },
    [token, fullName, targetCountries, targetSectors, targetRoles, tc],
  )

  const handleStep2Skip = useCallback(() => {
    setCurrentStep(3)
  }, [])

  const handleStep2Next = useCallback(async () => {
    if (!token) return
    setIsSubmitting(true)
    try {
      await apiClient.post<OnboardingStepResponse>(
        '/api/onboarding',
        { step: 2, data: {} },
        { token },
      )
    } catch {
      // Non-critical
    } finally {
      setIsSubmitting(false)
    }
    setCurrentStep(3)
  }, [token])

  const handleStep3 = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!token) return
      setError('')
      setIsSubmitting(true)
      try {
        const res = await apiClient.post<OnboardingStepResponse>(
          '/api/onboarding',
          { step: 3, data: { experienceYears, skills } },
          { token },
        )
        if (res.completed) {
          await refetch()
          router.replace('/')
        }
      } catch {
        setError(tc('genericError'))
      } finally {
        setIsSubmitting(false)
      }
    },
    [token, experienceYears, skills, tc, refetch, router],
  )

  const handleRefineSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!token || !refineInput.trim()) return
      const userMsg = refineInput.trim()
      setRefineInput('')
      setRefineMessages((prev) => [...prev, { role: 'user', content: userMsg }])
      setRefineSending(true)
      try {
        const res = await apiClient.post<RefineResponse>(
          '/api/onboarding/refine',
          { message: userMsg },
          { token },
        )
        setRefineMessages((prev) => [...prev, { role: 'assistant', content: res.message }])
      } catch {
        setRefineMessages((prev) => [
          ...prev,
          { role: 'assistant', content: tc('genericError') },
        ])
      } finally {
        setRefineSending(false)
      }
    },
    [token, refineInput, tc],
  )

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-text-muted)]">{tc('loading')}</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[var(--color-bg-light)] flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">{t('title')}</h1>
          <p className="text-[var(--color-text-muted)]">{t('subtitle')}</p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--color-text-muted)]">
              {t('stepOf', { current: currentStep, total: TOTAL_STEPS })}
            </span>
          </div>
          <div className="w-full bg-[var(--color-border)] rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {[t('step1Title'), t('step2Title'), t('step3Title')].map((label, i) => (
              <span
                key={label}
                className={`text-xs font-medium ${i + 1 <= currentStep ? 'text-primary' : 'text-[var(--color-text-muted)]'}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Step 1 */}
        {currentStep === 1 && (
          <form
            onSubmit={handleStep1}
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
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                placeholder="Jean Dupont"
              />
            </div>

            <TagInput
              label={t('targetCountries')}
              value={targetCountries}
              onChange={setTargetCountries}
              placeholder="NZ, AU, CA..."
              maxLength={3}
            />

            <TagInput
              label={t('targetSectors')}
              value={targetSectors}
              onChange={setTargetSectors}
              placeholder="Tech, Finance..."
            />

            <TagInput
              label={t('targetRoles')}
              value={targetRoles}
              onChange={setTargetRoles}
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
        )}

        {/* Step 2 */}
        {currentStep === 2 && (
          <div className="bg-[var(--color-surface-light)] rounded-xl border border-[var(--color-border)] p-6 space-y-5">
            <h2 className="text-xl font-semibold">{t('step2Title')}</h2>

            {hasCv ? (
              <p className="text-sm text-primary font-medium">
                {t('cvParsed')}
              </p>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                {t('cvUpload')}
              </p>
            )}

            {cvMessage && (
              <p className="text-sm text-primary">{cvMessage}</p>
            )}

            <label
              htmlFor="cv-onboarding"
              className="inline-flex cursor-pointer items-center rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-primary/5 transition-colors"
            >
              {cvUploading ? tc('saving') : t('cvUpload')}
              <input
                id="cv-onboarding"
                type="file"
                accept=".pdf,.txt"
                onChange={handleCvUpload}
                className="hidden"
                disabled={cvUploading}
              />
            </label>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-sm text-[var(--color-text-muted)] hover:text-primary"
              >
                {t('back')}
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleStep2Skip}
                  className="text-sm text-[var(--color-text-muted)] hover:text-primary"
                >
                  {t('step2Skip')}
                </button>
                <Button type="button" onClick={handleStep2Next} disabled={isSubmitting}>
                  {t('next')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {currentStep === 3 && (
          <form
            onSubmit={handleStep3}
            className="bg-[var(--color-surface-light)] rounded-xl border border-[var(--color-border)] p-6 space-y-5"
          >
            <h2 className="text-xl font-semibold">{t('step3Title')}</h2>

            <div>
              <label htmlFor="experienceYears" className="block text-sm font-medium mb-1">
                {t('experienceYears')}
              </label>
              <input
                id="experienceYears"
                type="number"
                min={0}
                max={50}
                value={experienceYears}
                onChange={(e) => setExperienceYears(Number.parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <TagInput
              label={t('skills')}
              value={skills}
              onChange={setSkills}
              placeholder="TypeScript, React, Node.js..."
            />

            {/* IA Refinement chat */}
            <div className="border border-[var(--color-border)] rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-1">{t('refineTitle')}</h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">{t('refineSubtitle')}</p>

              <div className="min-h-[80px] max-h-48 overflow-y-auto space-y-2 mb-3">
                {refineMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`text-xs rounded-lg px-3 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary/10 text-primary ml-4'
                        : 'bg-[var(--color-bg-light)] text-[var(--color-text)] mr-4'
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={refineInput}
                  onChange={(e) => setRefineInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void handleRefineSubmit(e as unknown as FormEvent)
                    }
                  }}
                  placeholder="Demandez de l'aide à l'IA..."
                  className="flex-1 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
                  disabled={refineSending}
                />
                <button
                  type="button"
                  onClick={(e) => void handleRefineSubmit(e as unknown as FormEvent)}
                  disabled={refineSending || !refineInput.trim()}
                  className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary font-medium hover:bg-primary/20 disabled:opacity-50"
                >
                  →
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-[var(--color-error)]">{error}</p>
            )}

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-sm text-[var(--color-text-muted)] hover:text-primary"
              >
                {t('back')}
              </button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? tc('saving') : t('finish')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
