import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScoreProgressBar } from './score-progress-bar'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/i18n/en.json'

function renderWithIntl(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('ScoreProgressBar', () => {
  it('renders progress element with value and max attributes', () => {
    renderWithIntl(<ScoreProgressBar score={87} />)
    const bar = screen.getByRole('progressbar')
    expect(bar.tagName.toLowerCase()).toBe('progress')
    expect(bar).toHaveAttribute('value', '87')
    expect(bar).toHaveAttribute('max', '100')
  })

  it('displays the score percentage', () => {
    renderWithIntl(<ScoreProgressBar score={87} />)
    // The percentage appears in the visible span
    const elements = screen.getAllByText('87%')
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })

  it('has data-testid="job-offer-detail-score"', () => {
    renderWithIntl(<ScoreProgressBar score={50} />)
    expect(screen.getByTestId('job-offer-detail-score')).toBeInTheDocument()
  })
})
