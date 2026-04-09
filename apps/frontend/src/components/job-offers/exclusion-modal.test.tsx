import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExclusionModal } from './exclusion-modal'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/i18n/en.json'

function renderWithIntl(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('ExclusionModal', () => {
  it('renders nothing when isOpen is false', () => {
    renderWithIntl(<ExclusionModal isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.queryByTestId('exclusion-modal')).not.toBeInTheDocument()
  })

  it('renders modal using dialog element when open', () => {
    renderWithIntl(<ExclusionModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} />)
    const modal = screen.getByTestId('exclusion-modal')
    expect(modal.tagName.toLowerCase()).toBe('dialog')
    expect(modal).toHaveAttribute('open')
  })

  it('renders 6 category options in the dropdown', () => {
    renderWithIntl(<ExclusionModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} />)
    const select = screen.getByTestId('exclusion-category-select')
    const options = select.querySelectorAll('option')
    expect(options).toHaveLength(6)
  })

  it('renders a free-text reason input', () => {
    renderWithIntl(<ExclusionModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByTestId('exclusion-reason-input')).toBeInTheDocument()
  })

  it('calls onConfirm with category and reason when confirm clicked', () => {
    const onConfirm = vi.fn()
    renderWithIntl(<ExclusionModal isOpen onClose={vi.fn()} onConfirm={onConfirm} />)
    fireEvent.change(screen.getByTestId('exclusion-category-select'), { target: { value: 'salary' } })
    fireEvent.change(screen.getByTestId('exclusion-reason-input'), { target: { value: 'Below 120k' } })
    fireEvent.click(screen.getByTestId('exclusion-confirm-button'))
    expect(onConfirm).toHaveBeenCalledWith('salary', 'Below 120k')
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    renderWithIntl(<ExclusionModal isOpen onClose={onClose} onConfirm={vi.fn()} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('does not render dangerouslySetInnerHTML for user input', () => {
    renderWithIntl(<ExclusionModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} />)
    const modal = screen.getByTestId('exclusion-modal')
    expect(modal.innerHTML).not.toContain('dangerouslySetInnerHTML')
  })
})
