import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JobOfferCompanyPanel } from './job-offer-company-panel'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/i18n/en.json'

function renderWithIntl(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

const baseCompany = {
  id: 'c1',
  name: 'TechCorp',
  sector: 'Technology',
  size: '50-200',
  companyType: 'hiring_company',
}

describe('JobOfferCompanyPanel', () => {
  it('renders company name, sector, and size', () => {
    renderWithIntl(<JobOfferCompanyPanel company={baseCompany} />)
    expect(screen.getByTestId('job-offer-detail-company-panel')).toBeInTheDocument()
    expect(screen.getByText('TechCorp')).toBeInTheDocument()
    expect(screen.getByTestId('company-sector')).toHaveTextContent('Technology')
    expect(screen.getByTestId('company-size')).toHaveTextContent('50-200')
  })

  it('renders company type badge', () => {
    renderWithIntl(<JobOfferCompanyPanel company={baseCompany} />)
    expect(screen.getByTestId('company-type-badge')).toHaveTextContent('Hiring company')
  })

  it('renders accreditation badge when isAccredited=true', () => {
    renderWithIntl(<JobOfferCompanyPanel company={{ ...baseCompany, companyType: 'accredited_employer' }} isAccredited />)
    expect(screen.getByTestId('accreditation-badge')).toHaveTextContent('Immigration accredited')
  })

  it('renders recruitment agency badge with correct label', () => {
    renderWithIntl(<JobOfferCompanyPanel company={{ ...baseCompany, companyType: 'recruitment_agency' }} />)
    expect(screen.getByTestId('company-type-badge')).toHaveTextContent('Recruitment agency')
  })
})
