'use client'

import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Sidebar } from '@/components/layout/sidebar'
import { JobOfferDetailHeader } from '@/components/job-offers/job-offer-detail-header'
import { JobOfferCompanyPanel } from '@/components/job-offers/job-offer-company-panel'
import { JobOfferAiEvaluation } from '@/components/job-offers/job-offer-ai-evaluation'
import { JobOfferActionsBar } from '@/components/job-offers/job-offer-actions-bar'
import { CrossPipelineBadge } from '@/components/job-offers/cross-pipeline-badge'
import { ExclusionModal } from '@/components/job-offers/exclusion-modal'
import { CvTab } from '@/components/job-offers/cv/cv-tab'
import { SendTab } from '@/components/job-offers/send/send-tab'
import { RecruitmentContactsPanel } from '@/components/job-offers/recruitment-contacts/recruitment-contacts-panel'
import { useJobOfferDetail } from '@/hooks/use-job-offer-detail'
import { useAuth } from '@/contexts/auth-context'
import { useState, useCallback } from 'react'
import type { ExclusionCategory } from '@/lib/job-offers-api'
import type { ReactNode } from 'react'

type DetailTab = 'details' | 'cv' | 'send'

export default function JobOfferDetailPage(): ReactNode {
  const params = useParams<{ id: string }>()
  const { token } = useAuth()
  const t = useTranslations('jobOfferDetailPage')
  const tc = useTranslations('common')

  const {
    offer,
    hasCrossContact,
    isLoading,
    error,
    updateStatus,
    updateAdvice,
    excludeOffer,
    refetch,
  } = useJobOfferDetail(params.id, token ?? '')

  const [isExclusionModalOpen, setIsExclusionModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<DetailTab>('details')

  const handleExclude = useCallback(async (category: ExclusionCategory, reason: string): Promise<void> => {
    await excludeOffer(category, reason)
    setIsExclusionModalOpen(false)
  }, [excludeOffer])

  const handleCancelExclusion = useCallback(async (): Promise<void> => {
    await updateStatus('new')
  }, [updateStatus])

  const handleReactivate = useCallback(async (): Promise<void> => {
    await updateStatus('new')
  }, [updateStatus])

  return (
    <div className="flex min-h-screen bg-[var(--color-surface)]">
      <Sidebar />

      <main id="main-content" className="flex-1 px-4 py-8 lg:px-8">
        {isLoading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-6 w-48 rounded bg-[var(--color-border)]" />
            <div className="h-10 w-96 rounded bg-[var(--color-border)]" />
            <div className="h-4 w-64 rounded bg-[var(--color-border)]" />
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-4 text-center">
            <p className="text-sm text-[var(--color-error)]">{error}</p>
            <button
              type="button"
              onClick={refetch}
              className="mt-2 text-sm font-medium text-primary hover:underline"
            >
              {tc('retry')}
            </button>
          </div>
        )}

        {!isLoading && !error && offer && (
          <div className="space-y-6">
            {/* Header */}
            <JobOfferDetailHeader
              title={offer.title}
              companyName={offer.companyName}
              location={offer.location}
              salaryMin={offer.salaryMin}
              salaryMax={offer.salaryMax}
              salaryCurrency={offer.salaryCurrency}
              remoteType={offer.remoteType}
              publicationDates={offer.publicationDates}
              closingDate={offer.closingDate}
              status={offer.status}
              isRepublished={offer.isRepublished}
              links={offer.links}
              onStatusChange={(s) => void updateStatus(s)}
              onCancelExclusion={offer.status === 'excluded' ? () => void handleCancelExclusion() : undefined}
              onReactivate={offer.status === 'expired' ? () => void handleReactivate() : undefined}
            />

            {/* Cross-pipeline badge */}
            {hasCrossContact && offer.companyName && (
              <CrossPipelineBadge companyName={offer.companyName} />
            )}

            {/* Tab navigation */}
            <div data-testid="detail-tabs" className="flex gap-1 border-b border-[var(--color-border)]">
              <button
                type="button"
                data-testid="tab-details"
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'details'
                    ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
              >
                {t('tabDetails')}
              </button>
              <button
                type="button"
                data-testid="tab-cv"
                onClick={() => setActiveTab('cv')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'cv'
                    ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
              >
                {t('tabCv')}
              </button>
              <button
                type="button"
                data-testid="tab-send"
                onClick={() => setActiveTab('send')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'send'
                    ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
              >
                {t('tabSend')}
              </button>
            </div>

            {/* Main content: 2/3 + 1/3 split on desktop */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left column: 2/3 */}
              <div className="space-y-6 lg:col-span-2">
                {activeTab === 'details' && (
                  <>
                    {/* Description */}
                    {offer.descriptionRaw && (
                      <div
                        data-testid="offer-description"
                        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4"
                      >
                        <h2 className="mb-3 font-semibold text-[var(--color-text-main)]">{t('descriptionTitle')}</h2>
                        <div className="prose prose-sm max-w-none text-[var(--color-text-main)] prose-headings:text-[var(--color-text-main)] prose-strong:text-[var(--color-text-main)]">
                          <p className="whitespace-pre-wrap">{offer.descriptionRaw}</p>
                        </div>
                      </div>
                    )}

                    {/* AI Evaluation */}
                    {(offer.relevanceScore !== null || offer.matchSummary || offer.selectionReason || offer.applicationAdvice) && (
                      <JobOfferAiEvaluation
                        score={offer.relevanceScore}
                        matchSummary={offer.matchSummary}
                        selectionReason={offer.selectionReason}
                        applicationAdvice={offer.applicationAdvice}
                        onAdviceSave={updateAdvice}
                      />
                    )}

                    {/* Actions */}
                    {offer.status !== 'excluded' && offer.status !== 'expired' && (
                      <div className="space-y-4">
                        <JobOfferActionsBar offerId={offer.id} />

                        <button
                          type="button"
                          onClick={() => setIsExclusionModalOpen(true)}
                          data-testid="exclude-offer-button"
                          className="text-sm text-[var(--color-error)] hover:underline"
                        >
                          {t('excludeThisOffer')}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'cv' && (
                  <CvTab offerId={offer.id} token={token ?? ''} />
                )}

                {activeTab === 'send' && (
                  <SendTab offerId={offer.id} token={token ?? ''} contactEmail={offer.contactEmail} />
                )}
              </div>

              {/* Right column: 1/3 */}
              <div className="space-y-4 lg:col-span-1">
                {offer.company && (
                  <JobOfferCompanyPanel company={offer.company} />
                )}
                <RecruitmentContactsPanel offerId={offer.id} token={token ?? ''} />
              </div>
            </div>
          </div>
        )}

        {/* Exclusion Modal */}
        <ExclusionModal
          isOpen={isExclusionModalOpen}
          onClose={() => setIsExclusionModalOpen(false)}
          onConfirm={(category, reason) => void handleExclude(category, reason)}
        />
      </main>
    </div>
  )
}
