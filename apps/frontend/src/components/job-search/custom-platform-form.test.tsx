import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CustomPlatformForm } from './custom-platform-form'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/i18n/en.json'

function renderWithIntl(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('CustomPlatformForm', () => {
  const mockOnAdd = vi.fn()

  it('renders form with inputs and add button', () => {
    renderWithIntl(<CustomPlatformForm onAdd={mockOnAdd} />)
    expect(screen.getByTestId('custom-platform-form')).toBeInTheDocument()
    expect(screen.getByTestId('custom-platform-name-input')).toBeInTheDocument()
    expect(screen.getByTestId('custom-platform-url-input')).toBeInTheDocument()
    expect(screen.getByTestId('custom-platform-add-btn')).toBeInTheDocument()
  })

  it('add button is disabled when inputs are empty', () => {
    renderWithIntl(<CustomPlatformForm onAdd={mockOnAdd} />)
    // ORACLE: empty inputs → button disabled
    const btn = screen.getByTestId('custom-platform-add-btn')
    expect(btn).toBeDisabled()
  })

  it('add button is enabled when both name and url are filled', () => {
    renderWithIntl(<CustomPlatformForm onAdd={mockOnAdd} />)
    const nameInput = screen.getByTestId('custom-platform-name-input')
    const urlInput = screen.getByTestId('custom-platform-url-input')

    fireEvent.change(nameInput, { target: { value: 'MyBoard' } })
    fireEvent.change(urlInput, { target: { value: 'https://myboard.com' } })

    // ORACLE: both filled → button enabled
    const btn = screen.getByTestId('custom-platform-add-btn')
    expect(btn).not.toBeDisabled()
  })

  it('shows error for invalid URL (no http/https)', async () => {
    renderWithIntl(<CustomPlatformForm onAdd={mockOnAdd} />)
    const nameInput = screen.getByTestId('custom-platform-name-input')
    const urlInput = screen.getByTestId('custom-platform-url-input')

    fireEvent.change(nameInput, { target: { value: 'Bad' } })
    fireEvent.change(urlInput, { target: { value: 'ftp://bad.com' } })
    fireEvent.submit(screen.getByTestId('custom-platform-form'))

    // ORACLE: invalid URL → error message
    const error = await screen.findByTestId('custom-platform-error')
    expect(error).toBeInTheDocument()
  })

  it('shows submitting state', () => {
    renderWithIntl(<CustomPlatformForm onAdd={mockOnAdd} isSubmitting />)
    const btn = screen.getByTestId('custom-platform-add-btn')
    // ORACLE: isSubmitting → shows "Adding..." text
    expect(btn).toHaveTextContent('Adding...')
  })
})
