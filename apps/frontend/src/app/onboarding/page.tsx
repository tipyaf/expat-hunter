'use client'

import { useAuth } from '@/contexts/auth-context'
import { apiClient } from '@/lib/api-client'
import { useProfile } from '@/hooks/use-profile'
import { useRouter } from 'next/navigation'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { OnboardingStep1 } from './onboarding-step1'
import { OnboardingStep2 } from './onboarding-step2'
import { OnboardingStep3 } from './onboarding-step3'

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

const TOTAL_STEPS = 3

export default function OnboardingPage() {
  const { user, token, isLoading: authLoading } = useAuth()
  const { profile, isLoading: profileLoading, uploadCv, refetch } = useProfile()
  const router = useRouter()
  const t = useTranslations('onboarding')
  const tc = useTranslations('common')

  const [currentStep, setCurrentStep] = useState(1)
  const [fullName, setFullName] = useState('')
  const [targetCountries, setTargetCountries] = useState<string[]>([])
  const [targetSectors, setTargetSectors] = useState<string[]>([])
  const [targetRoles, setTargetRoles] = useState<string[]>([])
  const [experienceYears, setExperienceYears] = useState(0)
  const [skills, setSkills] = useState<string[]>([])
  const [cvUploading, setCvUploading] = useState(false)
  const [cvMessage, setCvMessage] = useState('')
  const [refineMessages, setRefineMessages] = useState<RefineMessage[]>([])
  const [refineInput, setRefineInput] = useState('')
  const [refineSending, setRefineSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const hasCv = Boolean(profile?.cvText)

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
    if (user) setFullName(user.fullName ?? '')
  }, [user])

  useEffect(() => {
    if (!authLoading && !profileLoading && profile?.onboardingCompleted) {
      router.replace('/')
    }
  }, [authLoading, profileLoading, profile, router])

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
          { step: 1, data: { fullName, targetCountries, targetSectors, targetRoles } },
          { token },
        )
        setCurrentStep(2)
      } catch (err) {
        console.error('Onboarding step 1 failed:', err)
        setError(tc('genericError'))
      } finally {
        setIsSubmitting(false)
      }
    },
    [token, fullName, targetCountries, targetSectors, targetRoles, tc],
  )

  const handleStep2Next = useCallback(async () => {
    if (!token) return
    setIsSubmitting(true)
    try {
      await apiClient.post<OnboardingStepResponse>(
        '/api/onboarding',
        { step: 2, data: {} },
        { token },
      )
    } catch (err) {
      console.error('Onboarding step 2 failed:', err)
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
      } catch (err) {
        console.error('Onboarding step 3 failed:', err)
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
      } catch (err) {
        console.error('Onboarding refine failed:', err)
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">{t('title')}</h1>
          <p className="text-[var(--color-text-muted)]">{t('subtitle')}</p>
        </div>

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

        {currentStep === 1 && (
          <OnboardingStep1
            fullName={fullName}
            targetCountries={targetCountries}
            targetSectors={targetSectors}
            targetRoles={targetRoles}
            isSubmitting={isSubmitting}
            error={error}
            onFullNameChange={setFullName}
            onTargetCountriesChange={setTargetCountries}
            onTargetSectorsChange={setTargetSectors}
            onTargetRolesChange={setTargetRoles}
            onSubmit={handleStep1}
          />
        )}

        {currentStep === 2 && (
          <OnboardingStep2
            hasCv={hasCv}
            cvUploading={cvUploading}
            cvMessage={cvMessage}
            isSubmitting={isSubmitting}
            onCvUpload={handleCvUpload}
            onBack={() => setCurrentStep(1)}
            onSkip={() => setCurrentStep(3)}
            onNext={handleStep2Next}
          />
        )}

        {currentStep === 3 && (
          <OnboardingStep3
            experienceYears={experienceYears}
            skills={skills}
            refineMessages={refineMessages}
            refineInput={refineInput}
            refineSending={refineSending}
            chatEndRef={chatEndRef}
            isSubmitting={isSubmitting}
            error={error}
            onExperienceChange={setExperienceYears}
            onSkillsChange={setSkills}
            onRefineInputChange={setRefineInput}
            onRefineSubmit={handleRefineSubmit}
            onBack={() => setCurrentStep(2)}
            onSubmit={handleStep3}
          />
        )}
      </div>
    </div>
  )
}
