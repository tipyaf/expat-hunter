import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JobOfferDetailHeader } from './job-offer-detail-header'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/i18n/en.json'

function renderWithIntl(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

const baseProps = {
  title: 'Senior FE Developer',
  companyName: 'TechCorp',
  location: 'London, UK',
  salaryMin: 120000,
  salaryMax: 140000,
  salaryCurrency: 'GBP',
  remoteType: 'hybrid',
  publicationDates: ['2026-03-15'],
  closingDate: null,
  status: 'new' as const,
  isRepublished: false,
  links: [
    { platform: 'linkedin', url: 'https://linkedin.com/jobs/1', applyUrl: null },
  ],
  onStatusChange: vi.fn(),
}

describe('JobOfferDetailHeader', () => {
  it('renders all offer fields', () => {
    renderWithIntl(<JobOfferDetailHeader {...baseProps} />)
    expect(screen.getByTestId('job-offer-detail')).toBeInTheDocument()
    expect(screen.getByText('Senior FE Developer')).toBeInTheDocument()
    expect(screen.getByText('TechCorp')).toBeInTheDocument()
    expect(screen.getByText('London, UK')).toBeInTheDocument()
    expect(screen.getByTestId('salary-display')).toBeInTheDocument()
  })

  it('renders back-to-offers breadcrumb linking to /offres', () => {
    renderWithIntl(<JobOfferDetailHeader {...baseProps} />)
    const link = screen.getByTestId('back-to-offers')
    expect(link).toHaveAttribute('href', '/offres')
    expect(link).toHaveTextContent('Back to offers')
  })

  it('renders expired banner when status is expired', () => {
    renderWithIntl(
      <JobOfferDetailHeader {...baseProps} status="expired" onReactivate={vi.fn()} />
    )
    expect(screen.getByTestId('expired-banner')).toBeInTheDocument()
    expect(screen.getByTestId('reactivate-button')).toBeInTheDocument()
  })

  it('renders excluded banner with reason and cancel button', () => {
    renderWithIntl(
      <JobOfferDetailHeader
        {...baseProps}
        status="excluded"
        exclusionReason="Salary too low"
        onCancelExclusion={vi.fn()}
      />
    )
    expect(screen.getByTestId('excluded-banner')).toBeInTheDocument()
    expect(screen.getByText(/Salary too low/)).toBeInTheDocument()
    expect(screen.getByTestId('cancel-exclusion-button')).toBeInTheDocument()
  })

  it('renders platform links', () => {
    renderWithIntl(<JobOfferDetailHeader {...baseProps} />)
    expect(screen.getByTestId('platform-link-linkedin')).toHaveAttribute('href', 'https://linkedin.com/jobs/1')
  })
})
