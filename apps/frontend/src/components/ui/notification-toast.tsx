'use client'

import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface NotificationToastProps {
  message: string
  variant?: ToastVariant
  duration?: number
  onClose?: () => void
}

const icons: Record<ToastVariant, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles: Record<ToastVariant, string> = {
  success: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
}

export function NotificationToast({ message, variant = 'info', duration = 5000, onClose }: NotificationToastProps) {
  const [visible, setVisible] = useState(true)
  const Icon = icons[variant]

  useEffect(() => {
    if (duration <= 0) return
    const timer = setTimeout(() => {
      setVisible(false)
      onClose?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!visible) return null

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-[var(--radius-lg)] border px-4 py-3 shadow-[var(--shadow-lg)] animate-in slide-in-from-bottom-2 ${styles[variant]}`}>
      <Icon className="h-5 w-5 shrink-0" />
      <p className="text-sm font-medium">{message}</p>
      <button
        type="button"
        onClick={() => { setVisible(false); onClose?.() }}
        className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
