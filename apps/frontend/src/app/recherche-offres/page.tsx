'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { EmptyState } from '@/components/ui/empty-state'
import { JobSearchForm } from '@/components/job-search/job-search-form'
import { ActiveSearchCard } from '@/components/job-search/active-search-card'
import { useAuth } from '@/contexts/auth-context'
import { useJobSearches } from '@/hooks/use-job-searches'
import { Briefcase } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type { CreateJobSearchPayload } from '@/hooks/use-job-searches'

export default function JobSearchConfigPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { searches, isLoading, create, update, remove, triggerRun } = useJobSearches()
  const t = useTranslations('jobSearch')
  const tc = useTranslations('common')

  const [showForm, setShowForm] = useState(false)
  const [editingSearch, setEditingSearch] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--color-text-muted)]">{tc('loading')}</p>
      </div>
    )
  }

  const activeSearch = searches.find((s) => s.isActive) ?? null
  const editingSearchData = editingSearch ? searches.find((s) => s.id === editingSearch) ?? null : null

  async function handleCreate(data: CreateJobSearchPayload) {
    setIsSubmitting(true)
    try {
      await create(data)
      setShowForm(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUpdate(data: CreateJobSearchPayload) {
    if (!editingSearch) return
    setIsSubmitting(true)
    try {
      await update(editingSearch, data)
      setEditingSearch(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    await remove(id)
  }

  async function handleRun(id: string) {
    setRunningId(id)
    try {
      await triggerRun(id)
    } finally {
      setRunningId(null)
    }
  }

  const isEditing = editingSearch !== null
  const isCreating = showForm && !isEditing

  return (
    <div className="flex h-dvh overflow-hidden" data-testid="job-search-config-page">
      <Sidebar />
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 md:px-8 pt-8 pb-4 pl-16 md:pl-8 bg-[var(--color-bg-light)]">
          <h1 className="text-3xl font-bold text-primary mb-2" data-testid="job-search-page-title">
            {t('pageTitle')}
          </h1>
          <p className="text-[var(--color-text-muted)]">{t('pageSubtitle')}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 space-y-6">
          {isLoading ? (
            <p className="text-sm text-[var(--color-text-muted)]">{tc('loading')}</p>
          ) : isCreating || isEditing ? (
            <JobSearchForm
              initialData={editingSearchData}
              onSubmit={isEditing ? handleUpdate : handleCreate}
              onCancel={() => { setShowForm(false); setEditingSearch(null) }}
              isSubmitting={isSubmitting}
            />
          ) : activeSearch ? (
            <>
              <ActiveSearchCard
                search={activeSearch}
                onEdit={() => setEditingSearch(activeSearch.id)}
                onDelete={() => void handleDelete(activeSearch.id)}
                onRun={() => void handleRun(activeSearch.id)}
                isRunning={runningId === activeSearch.id}
              />
              {/* Show other searches if any */}
              {searches.filter((s) => s.id !== activeSearch.id).map((search) => (
                <ActiveSearchCard
                  key={search.id}
                  search={search}
                  onEdit={() => setEditingSearch(search.id)}
                  onDelete={() => void handleDelete(search.id)}
                  onRun={() => void handleRun(search.id)}
                  isRunning={runningId === search.id}
                />
              ))}
              <button
                type="button"
                onClick={() => setShowForm(true)}
                data-testid="job-search-add-btn"
                className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] px-4 py-3 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:border-primary hover:text-primary w-full"
              >
                {t('addSearch')}
              </button>
            </>
          ) : (
            <>
              <EmptyState
                icon={Briefcase}
                title={t('emptyTitle')}
                description={t('emptyDescription')}
              />
              <JobSearchForm
                onSubmit={handleCreate}
                isSubmitting={isSubmitting}
              />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
