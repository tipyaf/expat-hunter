'use client'

import { useTranslations } from 'next-intl'
import { Building2, Shield, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'

interface CompanyData {
  id: string
  name: string
  sector: string | null
  size: string | null
  companyType: string
}

interface JobOfferCompanyPanelProps {
  company: CompanyData
  isAccredited?: boolean
}

const COMPANY_TYPE_CONFIG: Record<string, { labelKey: string; colorClass: string }> = {
  accredited_employer: { labelKey: 'companyTypeAccredited', colorClass: 'text-[var(--color-success)] bg-[var(--color-success)]/10' },
  hiring_company: { labelKey: 'companyTypeHiring', colorClass: 'text-[var(--color-info)] bg-[var(--color-info)]/10' },
  recruitment_agency: { labelKey: 'companyTypeAgency', colorClass: 'text-[var(--color-warning)] bg-[var(--color-warning)]/10' },
  consulting: { labelKey: 'companyTypeConsulting', colorClass: 'text-[var(--color-text-muted)] bg-[var(--color-border)]/30' },
  unknown: { labelKey: 'companyTypeUnknown', colorClass: 'text-[var(--color-text-muted)] bg-[var(--color-border)]/30' },
}

export function JobOfferCompanyPanel({ company, isAccredited }: JobOfferCompanyPanelProps): ReactNode {
  const t = useTranslations('jobOfferDetailPage')
  const typeConfig = COMPANY_TYPE_CONFIG[company.companyType] ?? COMPANY_TYPE_CONFIG.unknown

  return (
    <div
      data-testid="job-offer-detail-company-panel"
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-light)] p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Building2 size={18} className="text-[var(--color-text-muted)]" aria-hidden="true" />
        <h3 className="font-semibold text-[var(--color-text-main)]">{company.name}</h3>
      </div>

      {company.sector && (
        <div className="text-sm text-[var(--color-text-muted)]" data-testid="company-sector">
          <span className="font-medium">{t('sector')}:</span> {company.sector}
        </div>
      )}

      {company.size && (
        <div className="text-sm text-[var(--color-text-muted)]" data-testid="company-size">
          <span className="font-medium">{t('companySize')}:</span> {company.size}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <span
          data-testid="company-type-badge"
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${typeConfig.colorClass}`}
        >
          {t(typeConfig.labelKey)}
        </span>

        {isAccredited && (
          <span
            data-testid="accreditation-badge"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--color-success)]"
          >
            <ShieldCheck size={12} aria-hidden="true" />
            {t('accredited')}
          </span>
        )}
      </div>
    </div>
  )
}
