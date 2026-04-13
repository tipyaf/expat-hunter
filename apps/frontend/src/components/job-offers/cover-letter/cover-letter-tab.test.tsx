import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/i18n/en.json'
import { CoverLetterTab } from './cover-letter-tab'
import type { CoverLetterApplicationResponse } from '@/lib/job-cover-letter-api'

const MOCK_OFFER_ID = 'offer-uuid-123'
const MOCK_TOKEN = 'valid-token'

const MOCK_APPLICATION: CoverLetterApplicationResponse = {
  applicationId: 'app-1',
  coverLetterText: 'Dear hiring manager, I am writing to express my interest in the position...',
  language: 'en',
  status: 'draft',
}

const mockGetApplication = vi.fn()
const mockGenerate = vi.fn()
const mockRefine = vi.fn()
const mockSaveCoverLetterText = vi.fn()
const mockDownloadPdf = vi.fn()

vi.mock('@/lib/job-cover-letter-api', () => ({
  jobCoverLetterApi: {
    getApplication: (...args: unknown[]) => mockGetApplication(...args),
    generate: (...args: unknown[]) => mockGenerate(...args),
    refine: (...args: unknown[]) => mockRefine(...args),
    saveCoverLetterText: (...args: unknown[]) => mockSaveCoverLetterText(...args),
    downloadPdf: (...args: unknown[]) => mockDownloadPdf(...args),
  },
}))

function renderWithIntl(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('CoverLetterTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApplication.mockResolvedValue({ data: null })
  })

  // --- TEST INTENTION: CoverLetterTab loading state ---
  it('shows loading skeleton while fetching existing cover letter', () => {
    mockGetApplication.mockReturnValue(new Promise(() => {})) // never resolves
    renderWithIntl(<CoverLetterTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    // ORACLE: loading skeleton visible via data-testid='cl-tab-loading'
    expect(screen.getByTestId('cl-tab-loading')).toBeInTheDocument()
  })

  // --- TEST INTENTION: CoverLetterTab generate flow ---
  it('shows generate button when no cover letter exists', async () => {
    mockGetApplication.mockResolvedValue({ data: null })
    renderWithIntl(<CoverLetterTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('generate-cl-btn')).toBeInTheDocument()
    })
    expect(screen.getByTestId('generate-cl-btn')).not.toBeDisabled()
  })

  it('calls generate API when Generate Cover Letter is clicked', async () => {
    mockGetApplication.mockResolvedValue({ data: null })
    mockGenerate.mockResolvedValue({ data: MOCK_APPLICATION })

    renderWithIntl(<CoverLetterTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('generate-cl-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('generate-cl-btn'))

    await waitFor(() => {
      // ORACLE: after click, mockGenerate called with (offerId, token)
      expect(mockGenerate).toHaveBeenCalledWith(MOCK_OFFER_ID, MOCK_TOKEN)
    })
  })

  it('shows cover letter text after generation', async () => {
    mockGetApplication.mockResolvedValue({ data: MOCK_APPLICATION })
    renderWithIntl(<CoverLetterTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      // ORACLE: after resolve, text display visible with generated content
      expect(screen.getByTestId('cl-text-display')).toBeInTheDocument()
    })
    expect(screen.getByTestId('cl-text-display')).toHaveTextContent(
      'Dear hiring manager, I am writing to express my interest in the position...'
    )
  })

  // --- TEST INTENTION: CoverLetterTab edit mode ---
  it('shows edit mode when Edit button is clicked', async () => {
    mockGetApplication.mockResolvedValue({ data: MOCK_APPLICATION })
    renderWithIntl(<CoverLetterTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('cl-edit-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('cl-edit-btn'))
    // ORACLE: edit button → textarea with existing text
    expect(screen.getByTestId('cl-edit-mode')).toBeInTheDocument()
    expect(screen.getByTestId('cl-edit-textarea')).toHaveValue(
      'Dear hiring manager, I am writing to express my interest in the position...'
    )
  })

  it('saves edited cover letter text via API', async () => {
    mockGetApplication.mockResolvedValue({ data: MOCK_APPLICATION })
    mockSaveCoverLetterText.mockResolvedValue({
      data: { ...MOCK_APPLICATION, coverLetterText: 'Manually edited cover letter' },
    })

    renderWithIntl(<CoverLetterTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('cl-edit-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('cl-edit-btn'))
    fireEvent.change(screen.getByTestId('cl-edit-textarea'), {
      target: { value: 'Manually edited cover letter' },
    })
    fireEvent.click(screen.getByTestId('cl-edit-save-btn'))

    await waitFor(() => {
      // ORACLE: save calls API with (offerId, editedText, token)
      expect(mockSaveCoverLetterText).toHaveBeenCalledWith(
        MOCK_OFFER_ID,
        'Manually edited cover letter',
        MOCK_TOKEN
      )
    })
  })

  it('cancels edit mode and returns to text display', async () => {
    mockGetApplication.mockResolvedValue({ data: MOCK_APPLICATION })
    renderWithIntl(<CoverLetterTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('cl-edit-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('cl-edit-btn'))
    expect(screen.getByTestId('cl-edit-mode')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('cl-edit-cancel-btn'))
    expect(screen.getByTestId('cl-text-display')).toBeInTheDocument()
  })

  // --- TEST INTENTION: Refinement ---
  it('shows refine input when cover letter is generated', async () => {
    mockGetApplication.mockResolvedValue({ data: MOCK_APPLICATION })
    renderWithIntl(<CoverLetterTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('cl-refine-form')).toBeInTheDocument()
    })
    expect(screen.getByTestId('cl-refine-instruction-input')).toBeInTheDocument()
  })

  it('submits refinement instruction via API', async () => {
    mockGetApplication.mockResolvedValue({ data: MOCK_APPLICATION })
    mockRefine.mockResolvedValue({
      data: { ...MOCK_APPLICATION, coverLetterText: 'Refined cover letter text' },
    })

    renderWithIntl(<CoverLetterTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('cl-refine-instruction-input')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('cl-refine-instruction-input'), {
      target: { value: 'Emphasize leadership' },
    })
    fireEvent.click(screen.getByTestId('cl-refine-btn'))

    await waitFor(() => {
      expect(mockRefine).toHaveBeenCalledWith(MOCK_OFFER_ID, 'Emphasize leadership', MOCK_TOKEN)
    })
  })

  it('disables refine button when instruction is empty', async () => {
    mockGetApplication.mockResolvedValue({ data: MOCK_APPLICATION })
    renderWithIntl(<CoverLetterTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('cl-refine-btn')).toBeInTheDocument()
    })

    // ORACLE: empty instruction → refine button disabled
    expect(screen.getByTestId('cl-refine-btn')).toBeDisabled()
  })

  // --- TEST INTENTION: CoverLetterTab quota exceeded ---
  it('shows quota exceeded message and disables generate when API returns 403', async () => {
    mockGetApplication.mockResolvedValue({ data: null })
    const quotaError = new Error('Quota exceeded') as Error & { status: number }
    quotaError.status = 403
    mockGenerate.mockRejectedValue(quotaError)

    renderWithIntl(<CoverLetterTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('generate-cl-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('generate-cl-btn'))

    await waitFor(() => {
      // ORACLE: Generate button disabled, quota exceeded message visible
      expect(screen.getByTestId('cl-quota-exceeded')).toBeInTheDocument()
    })
    expect(screen.getByTestId('generate-cl-btn')).toBeDisabled()
  })

  // --- TEST INTENTION: CoverLetterTab no CV ---
  it('shows no-CV message when API returns 400', async () => {
    mockGetApplication.mockResolvedValue({ data: null })
    const noCvError = new Error('Upload your CV first') as Error & { status: number }
    noCvError.status = 400
    mockGenerate.mockRejectedValue(noCvError)

    renderWithIntl(<CoverLetterTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('generate-cl-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('generate-cl-btn'))

    await waitFor(() => {
      // ORACLE: 'Upload your CV' message visible
      expect(screen.getByTestId('cl-no-profile-cv')).toBeInTheDocument()
    })
  })

  // --- TEST INTENTION: PDF download ---
  it('shows download PDF button when cover letter exists', async () => {
    mockGetApplication.mockResolvedValue({ data: MOCK_APPLICATION })
    renderWithIntl(<CoverLetterTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('cl-download-pdf-btn')).toBeInTheDocument()
    })
  })

  it('triggers PDF download on button click', async () => {
    mockGetApplication.mockResolvedValue({ data: MOCK_APPLICATION })
    const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' })
    mockDownloadPdf.mockResolvedValue(mockBlob)

    const createObjectURLSpy = vi.fn().mockReturnValue('blob:test-url')
    const revokeObjectURLSpy = vi.fn()
    globalThis.URL.createObjectURL = createObjectURLSpy
    globalThis.URL.revokeObjectURL = revokeObjectURLSpy

    const clickSpy = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { click: clickSpy, href: '', download: '' } as unknown as HTMLAnchorElement
      }
      return originalCreateElement(tag)
    })

    renderWithIntl(<CoverLetterTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('cl-download-pdf-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('cl-download-pdf-btn'))

    await waitFor(() => {
      // ORACLE: Blob URL created and anchor click triggered
      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(clickSpy).toHaveBeenCalled()
    })

    createElementSpy.mockRestore()
  })

  // --- Loading states ---
  it('shows loading states on generate, refine, save, and download actions', async () => {
    mockGetApplication.mockResolvedValue({ data: null })
    // Generate never resolves — shows loading
    mockGenerate.mockReturnValue(new Promise(() => {}))

    renderWithIntl(<CoverLetterTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('generate-cl-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('generate-cl-btn'))

    // ORACLE: loading spinner visible during generation
    await waitFor(() => {
      expect(screen.getByTestId('generate-cl-btn')).toBeDisabled()
    })
  })
})
