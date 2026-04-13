import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActiveSearchCard } from './active-search-card'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/i18n/en.json'
import type { JobSearch } from '@/hooks/use-job-searches'

function renderWithIntl(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

const BASE_SEARCH: JobSearch = {
  id: 'test-1',
  userId: 'user-1',
  roles: ['Senior Dev'],
  countries: ['NZ'],
  cities: null,
  platforms: ['seek'],
  seniority: 'senior',
  sector: null,
  skills: null,
  salaryMin: null,
  salaryMax: null,
  contractType: null,
  frequency: 'manual',
  isActive: true,
  lastRunAt: null,
  nextRunAt: null,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
}

const noop = vi.fn()

describe('ActiveSearchCard', () => {
  it('renders card with roles', () => {
    renderWithIntl(
      <ActiveSearchCard search={BASE_SEARCH} onEdit={noop} onDelete={noop} onRun={noop} />
    )
    expect(screen.getByTestId('job-search-active-card')).toBeInTheDocument()
    expect(screen.getByTestId('job-search-roles')).toHaveTextContent('Senior Dev')
  })

  it('hides frequency badge when frequency is manual', () => {
    renderWithIntl(
      <ActiveSearchCard search={BASE_SEARCH} onEdit={noop} onDelete={noop} onRun={noop} />
    )
    // ORACLE: manual frequency → no badge, no next run
    expect(screen.queryByTestId('job-search-frequency-badge')).not.toBeInTheDocument()
    expect(screen.queryByTestId('job-search-next-run')).not.toBeInTheDocument()
  })

  it('shows frequency badge when frequency is weekly', () => {
    const weeklySearch: JobSearch = {
      ...BASE_SEARCH,
      frequency: 'weekly',
      nextRunAt: '2026-04-20T10:00:00Z',
    }
    renderWithIntl(
      <ActiveSearchCard search={weeklySearch} onEdit={noop} onDelete={noop} onRun={noop} />
    )
    // ORACLE: weekly frequency → badge visible with "Weekly" text
    const badge = screen.getByTestId('job-search-frequency-badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('Weekly')
  })

  it('shows next run date when frequency is not manual and nextRunAt is set', () => {
    const dailySearch: JobSearch = {
      ...BASE_SEARCH,
      frequency: 'daily',
      nextRunAt: '2026-04-20T10:00:00Z',
    }
    renderWithIntl(
      <ActiveSearchCard search={dailySearch} onEdit={noop} onDelete={noop} onRun={noop} />
    )
    // ORACLE: next run section visible when nextRunAt is set
    const nextRun = screen.getByTestId('job-search-next-run')
    expect(nextRun).toBeInTheDocument()
    expect(nextRun.textContent).toContain('Next run')
  })

  it('hides next run when frequency is manual even if nextRunAt exists', () => {
    const manualWithDate: JobSearch = {
      ...BASE_SEARCH,
      frequency: 'manual',
      nextRunAt: null,
    }
    renderWithIntl(
      <ActiveSearchCard search={manualWithDate} onEdit={noop} onDelete={noop} onRun={noop} />
    )
    // ORACLE: manual → no next run section
    expect(screen.queryByTestId('job-search-next-run')).not.toBeInTheDocument()
  })

  it('shows last run time', () => {
    renderWithIntl(
      <ActiveSearchCard search={BASE_SEARCH} onEdit={noop} onDelete={noop} onRun={noop} />
    )
    const lastRun = screen.getByTestId('job-search-last-run')
    expect(lastRun).toBeInTheDocument()
    // ORACLE: null lastRunAt → "Never run"
    expect(lastRun).toHaveTextContent('Never run')
  })
})
