import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CrossPipelineBadge } from './cross-pipeline-badge'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/i18n/en.json'

function renderWithIntl(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('CrossPipelineBadge', () => {
  it('renders badge with company name', () => {
    renderWithIntl(<CrossPipelineBadge companyName="Acme" />)
    expect(screen.getByTestId('cross-pipeline-badge')).toBeInTheDocument()
    expect(screen.getByText('You have a contact at Acme')).toBeInTheDocument()
  })
})
