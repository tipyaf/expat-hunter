'use client'

import { useTranslations } from 'next-intl'

interface Step {
  key: string
  label: string
}

interface ProgressBarMultiStepProps {
  steps: Step[]
  currentStep: string | null
  progressPercent: number
  status: string
}

function getStepStatus(
  stepIndex: number,
  currentStepIndex: number,
  overallStatus: string
): 'completed' | 'active' | 'pending' | 'failed' {
  if (overallStatus === 'failed') {
    if (stepIndex === currentStepIndex) return 'failed'
    if (stepIndex < currentStepIndex) return 'completed'
    return 'pending'
  }
  if (overallStatus === 'completed') return 'completed'
  if (stepIndex < currentStepIndex) return 'completed'
  if (stepIndex === currentStepIndex) return 'active'
  return 'pending'
}

function stepColors(status: 'completed' | 'active' | 'pending' | 'failed') {
  switch (status) {
    case 'completed':
      return {
        circle: 'bg-green-500 text-white border-green-500',
        line: 'bg-green-500',
        label: 'text-green-700 dark:text-green-400',
      }
    case 'active':
      return {
        circle: 'bg-blue-500 text-white border-blue-500 animate-pulse',
        line: 'bg-[var(--color-border)]',
        label: 'text-blue-700 dark:text-blue-400 font-semibold',
      }
    case 'failed':
      return {
        circle: 'bg-red-500 text-white border-red-500',
        line: 'bg-[var(--color-border)]',
        label: 'text-red-700 dark:text-red-400',
      }
    default:
      return {
        circle: 'bg-[var(--color-surface-light)] text-[var(--color-text-muted)] border-[var(--color-border)]',
        line: 'bg-[var(--color-border)]',
        label: 'text-[var(--color-text-muted)]',
      }
  }
}

function stepIcon(status: 'completed' | 'active' | 'pending' | 'failed', index: number) {
  if (status === 'completed') return '✓'
  if (status === 'failed') return '✕'
  return String(index + 1)
}

function getProgressBarColor(status: string): string {
  if (status === 'failed') return 'bg-red-500'
  if (status === 'completed') return 'bg-green-500'
  return 'bg-blue-500'
}

function getStatusText(status: string, progressPercent: number, searchComplete: string, searchFailed: string): string {
  if (status === 'completed') return searchComplete
  if (status === 'failed') return searchFailed
  return `${progressPercent}%`
}

export function ProgressBarMultiStep({ steps, currentStep, progressPercent, status }: ProgressBarMultiStepProps) {
  const t = useTranslations('search')
  const currentStepIndex = steps.findIndex((s) => s.key === currentStep)

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="w-full h-2 bg-[var(--color-border)] rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressBarColor(status)}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, i) => {
          const stepStatus = getStepStatus(i, currentStepIndex, status)
          const colors = stepColors(stepStatus)

          return (
            <div key={step.key} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {i > 0 && (
                  <div className={`flex-1 h-0.5 ${i <= currentStepIndex ? 'bg-green-500' : 'bg-[var(--color-border)]'}`} />
                )}
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${colors.circle}`}
                >
                  {stepIcon(stepStatus, i)}
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 ${i < currentStepIndex ? 'bg-green-500' : 'bg-[var(--color-border)]'}`} />
                )}
              </div>
              <span className={`text-xs mt-2 text-center ${colors.label}`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Percentage */}
      <p className="text-center text-sm text-[var(--color-text-muted)] mt-3">
        {getStatusText(status, progressPercent, t('searchComplete'), t('searchFailed'))}
      </p>
    </div>
  )
}
