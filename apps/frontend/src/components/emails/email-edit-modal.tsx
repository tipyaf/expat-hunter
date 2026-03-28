'use client'

import { Button } from '@/components/ui/button'
import type { Email } from '@/hooks/use-emails'
import { usePresets } from '@/hooks/use-presets'
import type { GenerationPreset } from '@/hooks/use-presets'
import { useTemplates } from '@/hooks/use-templates'
import type { EmailTemplate } from '@/hooks/use-templates'
import { Sparkles, RefreshCw, FileText, Sliders, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

interface EmailEditModalProps {
  email: Email | null
  isOpen: boolean
  onClose: () => void
  updateEmail: (emailId: string, data: { subject: string; body: string }) => Promise<Email | undefined>
  onRegenerate: (emailId: string, options?: { instructions?: string; templateId?: string; presetId?: string }) => Promise<Email | undefined>
}

export function EmailEditModal({ email, isOpen, onClose, updateEmail, onRegenerate }: EmailEditModalProps) {
  const t = useTranslations('emails')
  const tc = useTranslations('common')
  const { templates } = useTemplates()
  const { presets } = usePresets()

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [instructions, setInstructions] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [selectedPresetId, setSelectedPresetId] = useState<string>('')
  const [isImproving, setIsImproving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false)
  const [isApplyingPreset, setIsApplyingPreset] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (email && isOpen) {
      setSubject(email.subject)
      setBody(email.body)
      setInstructions('')
      const defaultTemplate = templates.find((tpl: EmailTemplate) => tpl.isDefault)
      setSelectedTemplateId(defaultTemplate?.id ?? '')
      const defaultPreset = presets.find((p: GenerationPreset) => p.isDefault)
      setSelectedPresetId(defaultPreset?.id ?? '')
    }
  }, [email, isOpen, templates, presets])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen || !email) return null

  const isBusy = isImproving || isRegenerating || isApplyingTemplate || isApplyingPreset || isSaving

  const handleApplyPreset = async () => {
    if (!selectedPresetId) return
    setIsApplyingPreset(true)
    try {
      const updated = await onRegenerate(email.id, { presetId: selectedPresetId })
      if (updated) {
        setSubject(updated.subject)
        setBody(updated.body)
      }
    } finally {
      setIsApplyingPreset(false)
    }
  }

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) return
    setIsApplyingTemplate(true)
    try {
      const updated = await onRegenerate(email.id, { templateId: selectedTemplateId })
      if (updated) {
        setSubject(updated.subject)
        setBody(updated.body)
      }
    } finally {
      setIsApplyingTemplate(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateEmail(email.id, { subject, body })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleImprove = async () => {
    if (!instructions.trim()) return
    setIsImproving(true)
    try {
      const updated = await onRegenerate(email.id, { instructions: instructions.trim() })
      if (updated) {
        setSubject(updated.subject)
        setBody(updated.body)
        setInstructions('')
      }
    } finally {
      setIsImproving(false)
    }
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      const updated = await onRegenerate(email.id)
      if (updated) {
        setSubject(updated.subject)
        setBody(updated.body)
      }
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        className="relative z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-xl)] bg-[var(--color-surface-light)] p-6 shadow-[var(--shadow-lg)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-edit-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 id="email-edit-title" className="text-lg font-semibold text-[var(--color-text-main)]">
            {t('editEmail')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-[var(--color-bg-light)] transition-colors"
            aria-label={t('closeModal')}
          >
            <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Contact info */}
        {email.contact && (
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            {t('to')}: <span className="font-medium text-[var(--color-text-main)]">{email.contact.fullName}</span>
            {email.contact.role && ` — ${email.contact.role}`}
            {email.contact.company && ` @ ${email.contact.company.name}`}
          </p>
        )}

        {/* Subject */}
        <div className="mb-3">
          <label htmlFor="email-subject" className="block text-sm font-medium text-[var(--color-text-main)] mb-1">
            Subject
          </label>
          <input
            id="email-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isBusy}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-surface-light)] text-[var(--color-text-main)] disabled:opacity-50"
          />
        </div>

        {/* Body */}
        <div className="mb-4">
          <label htmlFor="email-body" className="block text-sm font-medium text-[var(--color-text-main)] mb-1">
            Body
          </label>
          <textarea
            id="email-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            disabled={isBusy}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-surface-light)] text-[var(--color-text-main)] disabled:opacity-50 resize-y"
          />
        </div>

        {/* Template selector */}
        {templates.length > 0 && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-light)] p-4 mb-4">
            <label htmlFor="template-select" className="block text-sm font-medium text-[var(--color-text-main)] mb-2">
              <FileText className="w-3.5 h-3.5 inline mr-1.5" />
              {t('selectTemplate')}
            </label>
            <div className="flex gap-2">
              <select
                id="template-select"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={isBusy}
                className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-surface-light)] text-[var(--color-text-main)] disabled:opacity-50"
              >
                <option value="">{t('noTemplate')}</option>
                {templates.map((tpl: EmailTemplate) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}{tpl.isDefault ? ' ★' : ''}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void handleApplyTemplate()}
                disabled={isBusy || !selectedTemplateId}
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                {isApplyingTemplate ? t('applyingTemplate') : t('applyTemplate')}
              </Button>
            </div>
          </div>
        )}

        {/* Preset selector */}
        {presets.length > 0 && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-light)] p-4 mb-4">
            <label htmlFor="preset-select" className="block text-sm font-medium text-[var(--color-text-main)] mb-2">
              <Sliders className="w-3.5 h-3.5 inline mr-1.5" />
              {t('selectPreset')}
            </label>
            <div className="flex gap-2">
              <select
                id="preset-select"
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                disabled={isBusy}
                className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-surface-light)] text-[var(--color-text-main)] disabled:opacity-50"
              >
                <option value="">{t('noPreset')}</option>
                {presets.map((p: GenerationPreset) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.isDefault ? ' ★' : ''}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void handleApplyPreset()}
                disabled={isBusy || !selectedPresetId}
              >
                <Sliders className="w-3.5 h-3.5 mr-1.5" />
                {isApplyingPreset ? t('applyingPreset') : t('applyPreset')}
              </Button>
            </div>
          </div>
        )}

        {/* AI assistance section */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-light)] p-4 mb-4">
          <label htmlFor="ai-instructions" className="block text-sm font-medium text-[var(--color-text-main)] mb-2">
            {t('aiInstructions')}
          </label>
          <textarea
            id="ai-instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            disabled={isBusy}
            placeholder={t('instructionsPlaceholder')}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-surface-light)] text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] disabled:opacity-50 resize-none mb-2"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void handleImprove()}
              disabled={isBusy || !instructions.trim()}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              {isImproving ? t('improving') : t('improveWithAi')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleRegenerate()}
              disabled={isBusy}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? t('regenerating') : t('regenerateCompletely')}
            </Button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isBusy}>
            {tc('cancel')}
          </Button>
          <Button onClick={() => void handleSave()} disabled={isBusy || !subject.trim() || !body.trim()}>
            {tc('save')}
          </Button>
        </div>
      </div>
    </div>
  )
}
