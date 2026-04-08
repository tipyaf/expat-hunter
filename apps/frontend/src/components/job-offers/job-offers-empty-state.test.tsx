import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      newTitle: 'No new offers',
      newDescription: 'Configure a job search to start receiving offers automatically.',
      appliedTitle: 'No applications yet',
      appliedDescription: 'Mark an offer as Applied to track your applications here.',
      archivedTitle: 'No archived offers',
      archivedDescription: 'Excluded or expired offers will appear here.',
      ctaNewSearch: 'Create a search',
      ctaExploreOffers: 'View new offers',
    }
    return messages[key] ?? key
  },
}))

import { JobOffersEmptyState } from './job-offers-empty-state'

describe('JobOffersEmptyState', () => {
  // ORACLE: Tab 'Nouvelles' empty → 'Aucune nouvelle offre' + CTA link; Tab 'Postulées' empty → 'Aucune candidature'
  it('renders empty state for "new" tab with CTA to search', () => {
    render(<JobOffersEmptyState tab="new" />)

    expect(screen.getByTestId('job-offers-empty-state')).toBeDefined()
    expect(screen.getByText('No new offers')).toBeDefined()
    expect(screen.getByText(/Configure a job search/)).toBeDefined()
    expect(screen.getByRole('link', { name: 'Create a search' })).toHaveAttribute('href', '/recherche-offres')
  })

  it('renders empty state for "applied" tab', () => {
    render(<JobOffersEmptyState tab="applied" />)

    expect(screen.getByText('No applications yet')).toBeDefined()
    expect(screen.getByText(/Mark an offer/)).toBeDefined()
  })

  it('renders empty state for "archived" tab', () => {
    render(<JobOffersEmptyState tab="archived" />)

    expect(screen.getByText('No archived offers')).toBeDefined()
    expect(screen.getByText(/Excluded or expired/)).toBeDefined()
  })
})
