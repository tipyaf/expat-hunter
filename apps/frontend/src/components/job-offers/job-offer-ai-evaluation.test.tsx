import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { JobOfferAiEvaluation } from './job-offer-ai-evaluation'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/i18n/en.json'

function renderWithIntl(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

const defaultProps = {
  score: 87,
  matchSummary: 'Strong TypeScript and React experience.',
  selectionReason: 'Matches 4/5 required skills.',
  applicationAdvice: 'Highlight your React expertise.',
  onAdviceSave: vi.fn().mockResolvedValue(undefined),
}

describe('JobOfferAiEvaluation', () => {
  it('displays score bar and summaries', () => {
    renderWithIntl(<JobOfferAiEvaluation {...defaultProps} />)
    expect(screen.getByTestId('job-offer-ai-evaluation')).toBeInTheDocument()
    expect(screen.getByTestId('job-offer-detail-score')).toBeInTheDocument()
    expect(screen.getByTestId('match-summary')).toHaveTextContent('Strong TypeScript and React experience.')
    expect(screen.getByTestId('selection-reason')).toHaveTextContent('Matches 4/5 required skills.')
  })

  it('shows advice text in read mode by default', () => {
    renderWithIntl(<JobOfferAiEvaluation {...defaultProps} />)
    expect(screen.getByTestId('advice-text')).toHaveTextContent('Highlight your React expertise.')
    expect(screen.getByTestId('advice-edit-button')).toBeInTheDocument()
  })

  it('toggles to edit mode when Edit is clicked', () => {
    renderWithIntl(<JobOfferAiEvaluation {...defaultProps} />)
    fireEvent.click(screen.getByTestId('advice-edit-button'))
    expect(screen.getByTestId('advice-textarea')).toBeInTheDocument()
    expect(screen.getByTestId('advice-save-button')).toBeInTheDocument()
  })

  it('calls onAdviceSave when Save is clicked', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    renderWithIntl(<JobOfferAiEvaluation {...defaultProps} onAdviceSave={onSave} />)
    fireEvent.click(screen.getByTestId('advice-edit-button'))
    fireEvent.change(screen.getByTestId('advice-textarea'), { target: { value: 'Updated advice' } })
    fireEvent.click(screen.getByTestId('advice-save-button'))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Updated advice'))
  })

  it('cancels editing and reverts text', () => {
    renderWithIntl(<JobOfferAiEvaluation {...defaultProps} />)
    fireEvent.click(screen.getByTestId('advice-edit-button'))
    fireEvent.change(screen.getByTestId('advice-textarea'), { target: { value: 'Changed' } })
    fireEvent.click(screen.getByTestId('advice-cancel-button'))
    expect(screen.getByTestId('advice-text')).toHaveTextContent('Highlight your React expertise.')
  })
})
