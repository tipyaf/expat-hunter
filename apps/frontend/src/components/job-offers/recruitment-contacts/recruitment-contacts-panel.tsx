'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRecruitmentContacts } from '@/hooks/use-recruitment-contacts'
import { Users, Plus, Pencil, Trash2, X, Check, UserCheck } from 'lucide-react'
import type { RecruitmentContact, CreateRecruitmentContactPayload, UpdateRecruitmentContactPayload } from '@/lib/job-recruitment-contacts-api'
import type { ReactNode } from 'react'

interface RecruitmentContactsPanelProps {
  readonly offerId: string
  readonly token: string
}

interface ContactFormData {
  name: string
  role: string
  email: string
  linkedinUrl: string
  notes: string
}

const EMPTY_FORM: ContactFormData = { name: '', role: '', email: '', linkedinUrl: '', notes: '' }

export function RecruitmentContactsPanel({ offerId, token }: RecruitmentContactsPanelProps): ReactNode {
  const t = useTranslations('recruitmentContacts')
  const {
    contacts,
    isLoading,
    isCreating,
    isUpdating,
    isRemoving,
    error,
    addContact,
    updateContact,
    removeContact,
    clearError,
  } = useRecruitmentContacts(offerId, token)

  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [addForm, setAddForm] = useState<ContactFormData>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ContactFormData>(EMPTY_FORM)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleOpenAddForm = useCallback((): void => {
    setIsAddFormOpen(true)
    setAddForm(EMPTY_FORM)
  }, [])

  const handleCloseAddForm = useCallback((): void => {
    setIsAddFormOpen(false)
    setAddForm(EMPTY_FORM)
  }, [])

  const handleAddSubmit = useCallback(async (): Promise<void> => {
    if (!addForm.name.trim()) return
    const payload: CreateRecruitmentContactPayload = {
      name: addForm.name.trim(),
      ...(addForm.role.trim() && { role: addForm.role.trim() }),
      ...(addForm.email.trim() && { email: addForm.email.trim() }),
      ...(addForm.linkedinUrl.trim() && { linkedinUrl: addForm.linkedinUrl.trim() }),
      ...(addForm.notes.trim() && { notes: addForm.notes.trim() }),
    }
    await addContact(payload)
    setIsAddFormOpen(false)
    setAddForm(EMPTY_FORM)
  }, [addForm, addContact])

  const handleStartEdit = useCallback((contact: RecruitmentContact): void => {
    setEditingId(contact.id)
    setEditForm({
      name: contact.name,
      role: contact.role ?? '',
      email: contact.email ?? '',
      linkedinUrl: contact.linkedinUrl ?? '',
      notes: contact.notes ?? '',
    })
  }, [])

  const handleCancelEdit = useCallback((): void => {
    setEditingId(null)
    setEditForm(EMPTY_FORM)
  }, [])

  const handleEditSubmit = useCallback(async (contactId: string): Promise<void> => {
    if (!editForm.name.trim()) return
    const payload: UpdateRecruitmentContactPayload = {
      name: editForm.name.trim(),
      role: editForm.role.trim() || null,
      email: editForm.email.trim() || null,
      linkedinUrl: editForm.linkedinUrl.trim() || null,
      notes: editForm.notes.trim() || null,
    }
    await updateContact(contactId, payload)
    setEditingId(null)
    setEditForm(EMPTY_FORM)
  }, [editForm, updateContact])

  const handleRemove = useCallback(async (contactId: string): Promise<void> => {
    setRemovingId(contactId)
    await removeContact(contactId)
    setRemovingId(null)
  }, [removeContact])

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid="recruitment-contacts-panel"
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4"
      >
        <div className="space-y-3 animate-pulse">
          <div className="h-5 w-40 rounded bg-[var(--color-border)]" />
          <div className="h-12 rounded bg-[var(--color-border)]" />
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="recruitment-contacts-panel"
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[var(--color-text-muted)]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-[var(--color-text-main)]">{t('title')}</h3>
        </div>
        {!isAddFormOpen && (
          <button
            type="button"
            data-testid="recruitment-contact-add-button"
            onClick={handleOpenAddForm}
            className="flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
          >
            <Plus size={14} aria-hidden="true" />
            {t('addBtn')}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-2">
          <p className="text-xs text-[var(--color-error)]">{error}</p>
          <button
            type="button"
            onClick={clearError}
            className="mt-1 text-xs text-[var(--color-primary)] hover:underline"
          >
            {t('dismiss')}
          </button>
        </div>
      )}

      {/* Empty state */}
      {contacts.length === 0 && !isAddFormOpen && (
        <p data-testid="recruitment-contacts-empty" className="text-xs text-[var(--color-text-muted)] text-center py-2">
          {t('emptyState')}
        </p>
      )}

      {/* Contact list */}
      {contacts.map((contact) => (
        <div
          key={contact.id}
          data-testid={`recruitment-contact-card-${contact.id}`}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2"
        >
          {editingId === contact.id ? (
            /* Edit form inline */
            <div data-testid="recruitment-contact-edit-form" className="space-y-2">
              <input
                type="text"
                data-testid="recruitment-contact-edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('namePlaceholder')}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] px-2 py-1.5 text-sm text-[var(--color-text-main)] focus:border-[var(--color-primary)] focus:outline-none"
                aria-label={t('nameLabel')}
              />
              <input
                type="text"
                data-testid="recruitment-contact-edit-role"
                value={editForm.role}
                onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                placeholder={t('rolePlaceholder')}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] px-2 py-1.5 text-sm text-[var(--color-text-main)] focus:border-[var(--color-primary)] focus:outline-none"
                aria-label={t('roleLabel')}
              />
              <input
                type="email"
                data-testid="recruitment-contact-edit-email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                placeholder={t('emailPlaceholder')}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] px-2 py-1.5 text-sm text-[var(--color-text-main)] focus:border-[var(--color-primary)] focus:outline-none"
                aria-label={t('emailLabel')}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  data-testid="recruitment-contact-edit-cancel"
                  onClick={handleCancelEdit}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
                >
                  <X size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  data-testid="recruitment-contact-edit-submit"
                  onClick={() => void handleEditSubmit(contact.id)}
                  disabled={isUpdating || !editForm.name.trim()}
                  className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-2 py-1 text-xs text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Check size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            /* Display mode */
            <>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--color-text-main)] truncate">{contact.name}</p>
                    {contact.leadId && (
                      <span
                        data-testid="recruitment-contact-cross-lead-badge"
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)]"
                      >
                        <UserCheck size={10} aria-hidden="true" />
                        {t('existingLead')}
                      </span>
                    )}
                  </div>
                  {contact.role && (
                    <p className="text-xs text-[var(--color-text-muted)]">{contact.role}</p>
                  )}
                  {contact.email && (
                    <p className="text-xs text-[var(--color-text-muted)]">{contact.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    type="button"
                    data-testid={`recruitment-contact-edit-${contact.id}`}
                    onClick={() => handleStartEdit(contact)}
                    className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-main)]"
                    aria-label={t('editLabel', { name: contact.name })}
                  >
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    data-testid={`recruitment-contact-remove-${contact.id}`}
                    onClick={() => void handleRemove(contact.id)}
                    disabled={isRemoving && removingId === contact.id}
                    className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-error)]/5 hover:text-[var(--color-error)] disabled:opacity-50"
                    aria-label={t('removeLabel', { name: contact.name })}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
              {contact.notes && (
                <p className="text-xs text-[var(--color-text-muted)] italic">{contact.notes}</p>
              )}
            </>
          )}
        </div>
      ))}

      {/* Add form */}
      {isAddFormOpen && (
        <div
          data-testid="recruitment-contact-add-form"
          className="rounded-[var(--radius-md)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-3 space-y-2"
        >
          <input
            type="text"
            data-testid="recruitment-contact-add-name"
            value={addForm.name}
            onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={t('namePlaceholder')}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text-main)] focus:border-[var(--color-primary)] focus:outline-none"
            aria-label={t('nameLabel')}
          />
          <input
            type="text"
            data-testid="recruitment-contact-add-role"
            value={addForm.role}
            onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
            placeholder={t('rolePlaceholder')}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text-main)] focus:border-[var(--color-primary)] focus:outline-none"
            aria-label={t('roleLabel')}
          />
          <input
            type="email"
            data-testid="recruitment-contact-add-email"
            value={addForm.email}
            onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
            placeholder={t('emailPlaceholder')}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text-main)] focus:border-[var(--color-primary)] focus:outline-none"
            aria-label={t('emailLabel')}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              data-testid="recruitment-contact-add-cancel"
              onClick={handleCloseAddForm}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
            >
              {t('cancelBtn')}
            </button>
            <button
              type="button"
              data-testid="recruitment-contact-add-submit-button"
              onClick={() => void handleAddSubmit()}
              disabled={isCreating || !addForm.name.trim()}
              className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t('adding')}
                </span>
              ) : (
                t('addSubmitBtn')
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
