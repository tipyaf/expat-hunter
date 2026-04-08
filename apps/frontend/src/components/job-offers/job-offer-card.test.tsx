import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      unknownCompany: 'Unknown company',
      republished: 'Republished',
      crossContact: 'Contact found',
      'score.high': 'Excellent match',
      'score.medium': 'Good match',
      'score.low': 'Moderate match',
      'score.veryLow': 'Low match',
    }
    return messages[key] ?? key
  },
}))

vi.mock('./job-offer-status-select', () => ({
  JobOfferStatusSelect: ({ currentStatus, onChange }: { currentStatus: string; onChange: (s: string) => void }) => (
    <select data-testid="job-offer-status-select" value={currentStatus} onChange={(e) => onChange(e.target.value)}>
      <option value="new">New</option>
      <option value="interested">Interested</option>
    </select>
  ),
}))

import { JobOfferCard } from './job-offer-card'
import type { JobOfferResponse } from '@/lib/job-offers-api'

function createMockOffer(overrides: Partial<JobOfferResponse> = {}): JobOfferResponse {
  return {
    id: '1',
    searchId: 's1',
    title: 'Senior FE',
    companyName: 'Acme',
    descriptionRaw: null,
    status: 'new',
    relevanceScore: 87,
    matchSummary: 'Strong React match',
    selectionReason: null,
    applicationAdvice: null,
    salaryMin: 80000,
    salaryMax: 120000,
    salaryCurrency: 'NZD',
    location: 'Auckland',
    remoteType: 'hybrid',
    publicationDates: ['2026-04-01'],
    closingDate: null,
    contactEmail: null,
    isRepublished: false,
    links: [
      { id: 'l1', platform: 'seek', url: 'https://seek.co.nz/job/1', applyUrl: null, externalId: null, scrapedAt: '2026-04-01' },
    ],
    company: { id: 'c1', name: 'Acme', sector: 'Tech', size: '50-200', companyType: 'hiring_company' },
    createdAt: '2026-04-01',
    updatedAt: '2026-04-01',
    ...overrides,
  }
}

describe('JobOfferCard', () => {
  // ORACLE: Given offer with title='Senior FE', company='Acme', score=87 → title, company, score badge all present in DOM
  it('renders all required data fields', () => {
    render(<JobOfferCard offer={createMockOffer()} onStatusChange={vi.fn()} />)

    expect(screen.getByTestId('job-offer-card-title')).toHaveTextContent('Senior FE')
    expect(screen.getByTestId('job-offer-card-company')).toHaveTextContent('Acme')
    expect(screen.getByTestId('job-offer-card-score')).toHaveTextContent('87%')
    // Also verify salary, location, summary
    expect(screen.getByText(/Auckland/)).toBeDefined()
    expect(screen.getByText(/80,000–120,000/)).toBeDefined()
    expect(screen.getByText('Strong React match')).toBeDefined()
  })

  // ORACLE: score=85 → green (#22C55E); score=65 → amber (#F59E0B); score=45 → blue (#3B82F6); score=30 → grey (#64748b)
  it('uses correct score color thresholds', () => {
    const { rerender } = render(
      <JobOfferCard offer={createMockOffer({ relevanceScore: 85 })} onStatusChange={vi.fn()} />
    )
    expect(screen.getByTestId('job-offer-card-score')).toHaveStyle({ backgroundColor: '#22C55E' })

    rerender(<JobOfferCard offer={createMockOffer({ relevanceScore: 65 })} onStatusChange={vi.fn()} />)
    expect(screen.getByTestId('job-offer-card-score')).toHaveStyle({ backgroundColor: '#F59E0B' })

    rerender(<JobOfferCard offer={createMockOffer({ relevanceScore: 45 })} onStatusChange={vi.fn()} />)
    expect(screen.getByTestId('job-offer-card-score')).toHaveStyle({ backgroundColor: '#3B82F6' })

    rerender(<JobOfferCard offer={createMockOffer({ relevanceScore: 30 })} onStatusChange={vi.fn()} />)
    expect(screen.getByTestId('job-offer-card-score')).toHaveStyle({ backgroundColor: '#64748b' })
  })

  it('displays republication badge when isRepublished=true', () => {
    render(<JobOfferCard offer={createMockOffer({ isRepublished: true })} onStatusChange={vi.fn()} />)
    expect(screen.getByTestId('job-offer-card-republication')).toBeDefined()
    expect(screen.getByText('Republished')).toBeDefined()
  })

  it('displays cross-contact badge when hasCrossContact=true', () => {
    render(<JobOfferCard offer={createMockOffer()} hasCrossContact={true} onStatusChange={vi.fn()} />)
    expect(screen.getByTestId('job-offer-card-cross-contact')).toBeDefined()
    expect(screen.getByText('Contact found')).toBeDefined()
  })

  it('does not display badges when conditions are false', () => {
    render(<JobOfferCard offer={createMockOffer({ isRepublished: false })} onStatusChange={vi.fn()} />)
    expect(screen.queryByTestId('job-offer-card-republication')).toBeNull()
    expect(screen.queryByTestId('job-offer-card-cross-contact')).toBeNull()
  })

  it('renders platform links', () => {
    render(<JobOfferCard offer={createMockOffer()} onStatusChange={vi.fn()} />)
    const link = screen.getByText('seek')
    expect(link.closest('a')).toHaveAttribute('href', 'https://seek.co.nz/job/1')
    expect(link.closest('a')).toHaveAttribute('target', '_blank')
  })

  it('calls onStatusChange when status is changed', () => {
    const onStatusChange = vi.fn()
    render(<JobOfferCard offer={createMockOffer()} onStatusChange={onStatusChange} />)

    const select = screen.getByTestId('job-offer-status-select')
    fireEvent.change(select, { target: { value: 'interested' } })
    expect(onStatusChange).toHaveBeenCalledWith('1', 'interested')
  })
})
