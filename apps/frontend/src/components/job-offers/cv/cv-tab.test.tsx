import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/i18n/en.json'
import { CvTab } from './cv-tab'
import type { CvApplicationResponse } from '@/lib/job-cv-api'

const MOCK_OFFER_ID = 'offer-uuid-123'
const MOCK_TOKEN = 'valid-token'

const MOCK_APPLICATION: CvApplicationResponse = {
  applicationId: 'app-1',
  cvText: 'Adapted CV content with improvements',
  cvReplacements: [
    { oldText: '5 years experience', newText: '8+ years experience in React and TypeScript' },
    { oldText: 'Basic knowledge of testing', newText: 'Extensive testing expertise with Vitest and Playwright' },
  ],
  language: 'en',
  status: 'draft',
}

const mockGetApplication = vi.fn()
const mockGenerate = vi.fn()
const mockRefine = vi.fn()
const mockSaveCvText = vi.fn()
const mockDownloadPdf = vi.fn()

vi.mock('@/lib/job-cv-api', () => ({
  jobCvApi: {
    getApplication: (...args: unknown[]) => mockGetApplication(...args),
    generate: (...args: unknown[]) => mockGenerate(...args),
    refine: (...args: unknown[]) => mockRefine(...args),
    saveCvText: (...args: unknown[]) => mockSaveCvText(...args),
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

describe('CvTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApplication.mockResolvedValue({ data: null })
  })

  it('shows loading state initially', () => {
    mockGetApplication.mockReturnValue(new Promise(() => {})) // never resolves
    renderWithIntl(<CvTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    expect(screen.getByTestId('cv-tab-loading')).toBeInTheDocument()
  })

  it('shows generate button when no application exists', async () => {
    mockGetApplication.mockResolvedValue({ data: null })
    renderWithIntl(<CvTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('generate-cv-btn')).toBeInTheDocument()
    })
    expect(screen.getByTestId('generate-cv-btn')).not.toBeDisabled()
  })

  it('calls generate API when Generate CV is clicked', async () => {
    mockGetApplication.mockResolvedValue({ data: null })
    mockGenerate.mockResolvedValue({ data: MOCK_APPLICATION })

    renderWithIntl(<CvTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('generate-cv-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('generate-cv-btn'))

    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalledWith(MOCK_OFFER_ID, MOCK_TOKEN)
    })
  })

  it('shows diff view after generation', async () => {
    mockGetApplication.mockResolvedValue({ data: MOCK_APPLICATION })
    renderWithIntl(<CvTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('cv-diff-view')).toBeInTheDocument()
    })
    // ORACLE: 2 replacements → 2 replacement cards
    expect(screen.getByTestId('replacement-card-0')).toBeInTheDocument()
    expect(screen.getByTestId('replacement-card-1')).toBeInTheDocument()
  })

  it('renders replacement old and new text correctly', async () => {
    mockGetApplication.mockResolvedValue({ data: MOCK_APPLICATION })
    renderWithIntl(<CvTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('replacement-old-0')).toBeInTheDocument()
    })
    // ORACLE: first replacement shows old → new
    expect(screen.getByTestId('replacement-old-0')).toHaveTextContent('5 years experience')
    expect(screen.getByTestId('replacement-new-0')).toHaveTextContent('8+ years experience in React and TypeScript')
  })

  it('shows edit mode when Edit button is clicked', async () => {
    mockGetApplication.mockResolvedValue({ data: MOCK_APPLICATION })
    renderWithIntl(<CvTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('cv-edit-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('cv-edit-btn'))
    expect(screen.getByTestId('cv-edit-mode')).toBeInTheDocument()
    expect(screen.getByTestId('cv-edit-textarea')).toHaveValue('Adapted CV content with improvements')
  })

  it('saves edited CV text', async () => {
    mockGetApplication.mockResolvedValue({ data: MOCK_APPLICATION })
    mockSaveCvText.mockResolvedValue({
      data: { ...MOCK_APPLICATION, cvText: 'Manually edited CV' },
    })

    renderWithIntl(<CvTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('cv-edit-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('cv-edit-btn'))
    fireEvent.change(screen.getByTestId('cv-edit-textarea'), { target: { value: 'Manually edited CV' } })
    fireEvent.click(screen.getByTestId('cv-edit-save-btn'))

    await waitFor(() => {
      expect(mockSaveCvText).toHaveBeenCalledWith(MOCK_OFFER_ID, 'Manually edited CV', MOCK_TOKEN)
    })
  })

  it('shows refine input when CV is generated', async () => {
    mockGetApplication.mockResolvedValue({ data: MOCK_APPLICATION })
    renderWithIntl(<CvTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('cv-refine-form')).toBeInTheDocument()
    })
    expect(screen.getByTestId('refine-instruction-input')).toBeInTheDocument()
  })

  it('submits refinement instruction', async () => {
    mockGetApplication.mockResolvedValue({ data: MOCK_APPLICATION })
    mockRefine.mockResolvedValue({
      data: { ...MOCK_APPLICATION, cvReplacements: [{ oldText: 'old', newText: 'new' }] },
    })

    renderWithIntl(<CvTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('refine-instruction-input')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('refine-instruction-input'), {
      target: { value: 'Emphasize leadership' },
    })
    fireEvent.click(screen.getByTestId('refine-cv-btn'))

    await waitFor(() => {
      expect(mockRefine).toHaveBeenCalledWith(MOCK_OFFER_ID, 'Emphasize leadership', MOCK_TOKEN)
    })
  })

  it('shows quota exceeded message when API returns 403', async () => {
    mockGetApplication.mockResolvedValue({ data: null })
    const quotaError = new Error('Quota exceeded') as Error & { status: number }
    quotaError.status = 403
    mockGenerate.mockRejectedValue(quotaError)

    renderWithIntl(<CvTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('generate-cv-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('generate-cv-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('cv-quota-exceeded')).toBeInTheDocument()
    })
    // ORACLE: generate button disabled after quota exceeded
    expect(screen.getByTestId('generate-cv-btn')).toBeDisabled()
  })

  it('shows download PDF button when CV exists', async () => {
    mockGetApplication.mockResolvedValue({ data: MOCK_APPLICATION })
    renderWithIntl(<CvTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('cv-download-pdf-btn')).toBeInTheDocument()
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

    renderWithIntl(<CvTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('cv-download-pdf-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('cv-download-pdf-btn'))

    await waitFor(() => {
      // ORACLE: createObjectURL called → anchor.click called → revokeObjectURL called
      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(clickSpy).toHaveBeenCalled()
    })

    createElementSpy.mockRestore()
  })

  it('shows no-cv message when API returns 400', async () => {
    mockGetApplication.mockResolvedValue({ data: null })
    const noCvError = new Error('Upload your CV first') as Error & { status: number }
    noCvError.status = 400
    mockGenerate.mockRejectedValue(noCvError)

    renderWithIntl(<CvTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('generate-cv-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('generate-cv-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('cv-no-profile-cv')).toBeInTheDocument()
    })
  })

  it('cancels edit mode and returns to diff view', async () => {
    mockGetApplication.mockResolvedValue({ data: MOCK_APPLICATION })
    renderWithIntl(<CvTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('cv-edit-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('cv-edit-btn'))
    expect(screen.getByTestId('cv-edit-mode')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('cv-edit-cancel-btn'))
    expect(screen.getByTestId('cv-diff-view')).toBeInTheDocument()
  })
})
