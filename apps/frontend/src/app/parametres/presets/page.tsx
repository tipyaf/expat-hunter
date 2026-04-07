'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useAuth } from '@/contexts/auth-context'
import { usePresets } from '@/hooks/use-presets'
import type { GenerationPreset, PresetFramework, PresetLength } from '@/hooks/use-presets'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Plus, Pencil, Trash2, Star } from 'lucide-react'

const LENGTHS: PresetLength[] = ['short', 'medium', 'long']
const FRAMEWORKS: PresetFramework[] = ['aida', 'pas', 'bab', 'direct']
const TONES = ['professional', 'friendly', 'direct', 'enthusiastic']

const EMPTY_FORM = {
  name: '',
  length: 'medium' as PresetLength,
  framework: 'direct' as PresetFramework,
  tone: ['professional'] as string[],
  language: 'fr',
  customInstructions: '',
  isDefault: false,
}

function toggleTone(form: typeof EMPTY_FORM, tone: string): typeof EMPTY_FORM {
  const tones = form.tone.includes(tone)
    ? form.tone.filter((t) => t !== tone)
    : [...form.tone, tone]
  // Keep at least one tone selected
  return { ...form, tone: tones.length > 0 ? tones : [tone] }
}

export default function PresetsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const t = useTranslations('presets')
  const tc = useTranslations('common')
  const { presets, isLoading, create, update, remove } = usePresets()

  const [editing, setEditing] = useState<GenerationPreset | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-text-muted)]">{tc('loading')}</p>
      </div>
    )
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (preset: GenerationPreset) => {
    setEditing(preset)
    // Support both old single-tone and new multi-tone format
    const toneArr = preset.tone.includes(',')
      ? preset.tone.split(',').map((t) => t.trim())
      : [preset.tone]
    setForm({
      name: preset.name,
      length: preset.length,
      framework: preset.framework,
      tone: toneArr,
      language: preset.language,
      customInstructions: preset.customInstructions ?? '',
      isDefault: preset.isDefault,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setMessage({ text: t('validationError'), type: 'error' })
      return
    }
    setSaving(true)
    try {
      const data = { ...form, tone: form.tone.join(', '), customInstructions: form.customInstructions || null }
      if (editing) {
        await update(editing.id, data)
        setMessage({ text: t('updateSuccess'), type: 'success' })
      } else {
        await create(data)
        setMessage({ text: t('createSuccess'), type: 'success' })
      }
      setShowForm(false)
    } catch {
      setMessage({ text: tc('error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await remove(deleteTarget)
    setDeleteTarget(null)
    setMessage({ text: t('deleteSuccess'), type: 'success' })
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <main id="main-content" className="flex-1 overflow-y-auto px-4 md:px-8 pt-8 pb-16 pl-16 md:pl-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-main)]">{t('title')}</h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">{t('subtitle')}</p>
            </div>
            {!showForm && (
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1" />
                {t('new')}
              </Button>
            )}
          </div>

          {message && (
            <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${
              message.type === 'error'
                ? 'bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 text-[var(--color-error)]'
                : 'bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 text-[var(--color-success)]'
            }`}>
              {message.text}
            </div>
          )}

          {/* Preset form (inline) */}
          {showForm && (
            <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-5 shadow-sm">
              <h2 className="text-base font-semibold text-[var(--color-text-main)] mb-4">
                {editing ? t('editTitle') : t('createTitle')}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">{t('fieldName')}</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder={t('namePlaceholder')}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-surface-light)] text-[var(--color-text-main)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">{t('fieldLength')}</label>
                    <div className="flex gap-1">
                      {LENGTHS.map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, length: l }))}
                          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                            form.length === l
                              ? 'bg-primary text-white'
                              : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-light)]'
                          }`}
                        >
                          {t(`length_${l}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">{t('fieldLanguage')}</label>
                    <select
                      value={form.language}
                      onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-surface-light)] text-[var(--color-text-main)]"
                    >
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">{t('fieldFramework')}</label>
                  <div className="grid grid-cols-4 gap-1">
                    {FRAMEWORKS.map((fw) => (
                      <button
                        key={fw}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, framework: fw }))}
                        className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                          form.framework === fw
                            ? 'bg-primary text-white'
                            : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-light)]'
                        }`}
                        title={t(`framework_${fw}_desc`)}
                      >
                        {fw.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                    {t(`framework_${form.framework}_desc`)}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">{t('fieldTone')}</label>
                  <div className="flex flex-wrap gap-1">
                    {TONES.map((tone) => {
                      const isSelected = form.tone.includes(tone)
                      return (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => setForm((f) => toggleTone(f, tone))}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            isSelected
                              ? 'bg-primary text-white'
                              : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-light)]'
                          }`}
                        >
                          {t(`tone_${tone}`)}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">{t('fieldCustomInstructions')}</label>
                  <textarea
                    value={form.customInstructions}
                    onChange={(e) => setForm((f) => ({ ...f, customInstructions: e.target.value }))}
                    rows={4}
                    placeholder={t('customInstructionsPlaceholder')}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-surface-light)] text-[var(--color-text-main)]"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm text-[var(--color-text-main)]">{t('setDefault')}</span>
                </label>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => void handleSave()} disabled={saving}>
                  {saving ? tc('saving') : tc('save')}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-light)]"
                >
                  {tc('cancel')}
                </button>
              </div>
            </div>
          )}

          {/* Presets list */}
          {(() => {
            if (isLoading) {
              return <p className="text-sm text-[var(--color-text-muted)]">{tc('loading')}</p>
            }
            if (presets.length === 0 && !showForm) {
              return (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-8 text-center">
                  <p className="text-[var(--color-text-muted)]">{t('empty')}</p>
                  <Button className="mt-4" onClick={openCreate}>
                    <Plus className="w-4 h-4 mr-1" />
                    {t('createFirst')}
                  </Button>
                </div>
              )
            }
            return (
              <div className="space-y-3">
                {presets.map((preset) => (
                <div key={preset.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-sm text-[var(--color-text-main)] truncate">{preset.name}</p>
                        {preset.isDefault && (
                          <span className="flex items-center gap-0.5 rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700">
                            <Star className="w-2.5 h-2.5" />
                            {t('default')}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                          {t(`length_${preset.length}`)}
                        </span>
                        <span className="rounded-full bg-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                          {preset.framework.toUpperCase()}
                        </span>
                        {(preset.tone.includes(',') ? preset.tone.split(',').map((t) => t.trim()) : [preset.tone]).map((tone) => (
                          <span key={tone} className="rounded-full bg-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                            {t(`tone_${tone}`)}
                          </span>
                        ))}
                        <span className="rounded-full bg-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                          {preset.language === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
                        </span>
                      </div>
                      {preset.customInstructions && (
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5 italic line-clamp-1">
                          {preset.customInstructions}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(preset)}
                        className="rounded-lg border border-[var(--color-border)] p-1.5 hover:bg-[var(--color-bg-light)] transition-colors"
                        aria-label={tc('edit')}
                      >
                        <Pencil className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(preset.id)}
                        className="rounded-lg border border-red-200 p-1.5 hover:bg-red-50 transition-colors"
                        aria-label={tc('delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
          })()}
        </div>
      </main>

      <ConfirmModal
        open={!!deleteTarget}
        title={t('deleteTitle')}
        message={t('deleteMessage')}
        confirmLabel={tc('delete')}
        cancelLabel={tc('cancel')}
        variant="danger"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
