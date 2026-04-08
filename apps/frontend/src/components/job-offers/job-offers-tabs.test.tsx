import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      tabs: 'Offer tabs',
      tabNew: 'New',
      tabApplied: 'Applied',
      tabArchived: 'Archived',
    }
    return messages[key] ?? key
  },
}))

import { JobOffersTabs } from './job-offers-tabs'

describe('JobOffersTabs', () => {
  const defaultCounts = { new: 12, applied: 5, archived: 3 }

  // ORACLE: Tab 'Nouvelles' shows [new, evaluated, interested]; Tab 'Postulées' shows [applied, interview, ...]; Tab 'Archivées' shows [excluded, expired]
  it('renders 3 tabs with proper ARIA roles', () => {
    render(
      <JobOffersTabs activeTab="new" onTabChange={vi.fn()} counts={defaultCounts} />
    )

    const tablist = screen.getByRole('tablist')
    expect(tablist).toBeDefined()

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)

    expect(screen.getByTestId('job-offers-tab-new')).toBeDefined()
    expect(screen.getByTestId('job-offers-tab-applied')).toBeDefined()
    expect(screen.getByTestId('job-offers-tab-archived')).toBeDefined()
  })

  it('marks active tab with aria-selected=true', () => {
    render(
      <JobOffersTabs activeTab="applied" onTabChange={vi.fn()} counts={defaultCounts} />
    )

    expect(screen.getByTestId('job-offers-tab-applied')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('job-offers-tab-new')).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByTestId('job-offers-tab-archived')).toHaveAttribute('aria-selected', 'false')
  })

  it('displays offer counts in badges', () => {
    render(
      <JobOffersTabs activeTab="new" onTabChange={vi.fn()} counts={defaultCounts} />
    )

    expect(screen.getByText('12')).toBeDefined()
    expect(screen.getByText('5')).toBeDefined()
    expect(screen.getByText('3')).toBeDefined()
  })

  it('calls onTabChange when a tab is clicked', () => {
    const onTabChange = vi.fn()
    render(
      <JobOffersTabs activeTab="new" onTabChange={onTabChange} counts={defaultCounts} />
    )

    fireEvent.click(screen.getByTestId('job-offers-tab-applied'))
    expect(onTabChange).toHaveBeenCalledWith('applied')
  })
})
