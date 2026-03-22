'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useAuth } from '@/contexts/auth-context'
import { useTemplates } from '@/hooks/use-templates'
import type { EmailTemplate } from '@/hooks/use-templates'
import { StatusMessage } from '@/components/ui/status-message'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Plus, Pencil, Trash2, Star } from 'lucide-react'

const EMPTY_FORM = { name: '', subjectPattern: '', bodyPattern: '', isDefault: false }

export default function TemplatesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const t = useTranslations('templates')
  const tc = useTranslations('common')
  const { templates, isLoading, create, update, remove } = useTemplates()

  const [editing, setEditing] = useState<EmailTemplate | null>(null)
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

  const openEdit = (tpl: EmailTemplate) => {
    setEditing(tpl)
    setForm({ name: tpl.name, subjectPattern: tpl.subjectPattern, bodyPattern: tpl.bodyPattern, isDefault: tpl.isDefault })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.subjectPattern.trim() || !form.bodyPattern.trim()) {
      setMessage({ text: t('validationError'), type: 'error' })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await update(editing.id, form)
        setMessage({ text: t('updateSuccess'), type: 'success' })
      } else {
        await create(form)
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
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />
              {t('new')}
            </Button>
          </div>

          {message && (
            <div className="mb-4">
              <StatusMessage type={message.type} message={message.text} />
            </div>
          )}

          {/* Template form (inline) */}
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
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">{t('fieldSubject')}</label>
                  <input
                    type="text"
                    value={form.subjectPattern}
                    onChange={(e) => setForm((f) => ({ ...f, subjectPattern: e.target.value }))}
                    placeholder={t('subjectPlaceholder')}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-surface-light)] text-[var(--color-text-main)]"
                  />
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{t('variablesHint')}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">{t('fieldBody')}</label>
                  <textarea
                    value={form.bodyPattern}
                    onChange={(e) => setForm((f) => ({ ...f, bodyPattern: e.target.value }))}
                    rows={8}
                    placeholder={t('bodyPlaceholder')}
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

          {/* Usage hint */}
          {!showForm && templates.length > 0 && (
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              {t('usageHint')}
            </p>
          )}

          {/* Template list */}
          {isLoading ? (
            <p className="text-sm text-[var(--color-text-muted)]">{tc('loading')}</p>
          ) : !showForm && templates.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-8 text-center">
              <p className="text-[var(--color-text-muted)]">{t('empty')}</p>
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1" />
                {t('createFirst')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((tpl) => (
                <div key={tpl.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-[var(--color-text-main)] truncate">{tpl.name}</p>
                        {tpl.isDefault && (
                          <span className="flex items-center gap-0.5 rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700">
                            <Star className="w-2.5 h-2.5" />
                            {t('default')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] truncate">{t('subject')}: {tpl.subjectPattern}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-2">{tpl.bodyPattern}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(tpl)}
                        className="rounded-lg border border-[var(--color-border)] p-1.5 hover:bg-[var(--color-bg-light)] transition-colors"
                        aria-label={tc('edit')}
                      >
                        <Pencil className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(tpl.id)}
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
          )}
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
