import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JobOfferActionsBar } from './job-offer-actions-bar'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/i18n/en.json'

function renderWithIntl(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('JobOfferActionsBar', () => {
  const offerId = 'abc-123'

  it('renders three action links', () => {
    renderWithIntl(<JobOfferActionsBar offerId={offerId} />)
    expect(screen.getByTestId('action-adapt-cv')).toBeInTheDocument()
    expect(screen.getByTestId('action-cover-letter')).toBeInTheDocument()
    expect(screen.getByTestId('action-apply')).toBeInTheDocument()
  })

  it('links to /offres/:id/candidature with correct section params', () => {
    renderWithIntl(<JobOfferActionsBar offerId={offerId} />)
    expect(screen.getByTestId('action-adapt-cv')).toHaveAttribute('href', `/offres/${offerId}/candidature?section=cv`)
    expect(screen.getByTestId('action-cover-letter')).toHaveAttribute('href', `/offres/${offerId}/candidature?section=cover-letter`)
    expect(screen.getByTestId('action-apply')).toHaveAttribute('href', `/offres/${offerId}/candidature?section=email`)
  })
})
