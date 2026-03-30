'use client'

import { CheckCircle2, Loader2, Mail, MailSearch, Search, Sparkles, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

type SearchStatus = 'pending' | 'scraping' | 'enriching' | 'analyzing' | 'generating' | 'completed' | 'failed'

interface Step {
  key: string
  label: string
  description: string
}

const STEP_ICONS = {
  scraping: Search,
  enriching: MailSearch,
  analyzing: Sparkles,
  generating: Mail,
} as const

export function TopIcon({ status }: { status: SearchStatus }) {
  if (status === 'completed') {
    return (
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle2 className="w-9 h-9 text-green-600" />
      </div>
    )
  }
  if (status === 'failed') {
    return (
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
        <XCircle className="w-9 h-9 text-red-600" />
      </div>
    )
  }
  return (
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    </div>
  )
}

function getStepState(
  stepIndex: number,
  currentStepIndex: number,
  status: SearchStatus
): 'completed' | 'active' | 'pending' | 'failed' {
  if (status === 'completed') return 'completed'
  if (status === 'failed') {
    if (stepIndex < currentStepIndex) return 'completed'
    if (stepIndex === currentStepIndex) return 'failed'
    return 'pending'
  }
  if (stepIndex < currentStepIndex) return 'completed'
  if (stepIndex === currentStepIndex) return 'active'
  return 'pending'
}

function isLineFilled(
  lineAfterStepIndex: number,
  currentStepIndex: number,
  status: SearchStatus
): boolean {
  if (status === 'completed') return true
  return lineAfterStepIndex < currentStepIndex
}

export function StepIndicator({ steps, currentStep, status }: {
  steps: Step[]
  currentStep: string | null
  status: SearchStatus
}) {
  const currentIndex = currentStep
    ? steps.findIndex(s => s.key === currentStep)
    : -1

  return (
    <div className="flex items-start w-full">
      {steps.map((step, i) => {
        const Icon = STEP_ICONS[step.key as keyof typeof STEP_ICONS] ?? Search
        const state = getStepState(i, currentIndex, status)

        const circleClasses = {
          completed: 'bg-green-100 border-green-500',
          active: 'bg-primary/10 border-primary',
          failed: 'bg-red-100 border-red-500',
          pending: 'bg-[var(--color-surface-light)] border-[var(--color-border)]',
        }[state]

        const labelClasses = {
          completed: 'text-green-600',
          active: 'text-primary font-semibold',
          failed: 'text-red-600',
          pending: 'text-[var(--color-text-muted)]',
        }[state]

        return (
          <div key={step.key} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              {/* Line before circle */}
              {i > 0 && (
                <div className={`flex-1 h-0.5 transition-colors duration-500 ${
                  isLineFilled(i - 1, currentIndex, status) ? 'bg-green-500' : 'bg-[var(--color-border)]'
                }`} />
              )}
              {/* Circle */}
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${circleClasses}`}>
                {state === 'failed' ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : state === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Icon className={`w-5 h-5 ${state === 'active' ? 'text-primary animate-pulse' : 'text-[var(--color-text-muted)]'}`} />
                )}
              </div>
              {/* Line after circle */}
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 transition-colors duration-500 ${
                  isLineFilled(i, currentIndex, status) ? 'bg-green-500' : 'bg-[var(--color-border)]'
                }`} />
              )}
            </div>
            <span className={`text-xs mt-2 text-center hidden sm:block ${labelClasses}`}>
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Rotating activity messages so the user knows something is happening
 * even when the backend hasn't updated the status yet.
 */
export function useRotatingMessage(status: SearchStatus, currentStep: string | null, t: ReturnType<typeof useTranslations>) {
  const [messageIndex, setMessageIndex] = useState(0)

  const messages: Record<string, string[]> = {
    pending: [
      t('progressMsg_connecting'),
      t('progressMsg_preparing'),
      t('progressMsg_pending3'),
      t('progressMsg_pending4'),
    ],
    scraping: [
      t('progressMsg_scraping1'),
      t('progressMsg_scraping2'),
      t('progressMsg_scraping3'),
      t('progressMsg_scraping4'),
      t('progressMsg_scraping5'),
      t('progressMsg_scraping6'),
      t('progressMsg_scraping7'),
      t('progressMsg_scraping8'),
      t('progressMsg_scraping9'),
      t('progressMsg_scraping10'),
      t('progressMsg_scraping11'),
      t('progressMsg_scraping12'),
      t('progressMsg_scraping13'),
      t('progressMsg_scraping14'),
      t('progressMsg_scraping15'),
    ],
    enriching: [
      t('progressMsg_enriching1'),
      t('progressMsg_enriching2'),
      t('progressMsg_enriching3'),
      t('progressMsg_enriching4'),
    ],
    analyzing: [
      t('progressMsg_analyzing1'),
      t('progressMsg_analyzing2'),
      t('progressMsg_analyzing3'),
      t('progressMsg_analyzing4'),
      t('progressMsg_analyzing5'),
      t('progressMsg_analyzing6'),
      t('progressMsg_analyzing7'),
      t('progressMsg_analyzing8'),
    ],
    generating: [
      t('progressMsg_generating1'),
      t('progressMsg_generating2'),
      t('progressMsg_generating3'),
      t('progressMsg_generating4'),
      t('progressMsg_generating5'),
      t('progressMsg_generating6'),
    ],
  }

  const step = currentStep ?? status
  const pool = messages[step] ?? messages.pending ?? []

  useEffect(() => {
    if (status === 'completed' || status === 'failed') return
    const interval = setInterval(() => {
      setMessageIndex(prev => prev + 1)
    }, 8000)
    return () => clearInterval(interval)
  }, [status])

  // Reset index when step changes
  useEffect(() => {
    setMessageIndex(0)
  }, [currentStep])

  if (pool.length === 0) return ''
  return pool[messageIndex % pool.length]
}
