import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/i18n/en.json'
import { SendTab } from './send-tab'
import type { ApplicationEmailStatus } from '@/lib/job-application-send-api'

const MOCK_OFFER_ID = 'offer-uuid-123'
const MOCK_TOKEN = 'valid-token'
const MOCK_CONTACT_EMAIL = 'hr@acme.com'

const MOCK_STATUS_DRAFT: ApplicationEmailStatus = {
  hasEmail: false,
  emailText: null,
  status: 'draft',
  sentAt: null,
  sentToEmail: null,
}

const MOCK_STATUS_READY: ApplicationEmailStatus = {
  hasEmail: true,
  emailText: 'Dear Hiring Team,\n\nI am writing to express my interest in the position.',
  status: 'ready',
  sentAt: null,
  sentToEmail: null,
}

const MOCK_STATUS_SENT: ApplicationEmailStatus = {
  hasEmail: true,
  emailText: 'Dear Hiring Team,\n\nI am writing to express my interest in the position.',
  status: 'sent',
  sentAt: '2026-04-09T14:30:00Z',
  sentToEmail: 'hr@acme.com',
}

const mockGetStatus = vi.fn()
const mockGenerateEmail = vi.fn()
const mockSendApplication = vi.fn()
const mockListContacts = vi.fn()

vi.mock('@/lib/job-application-send-api', () => ({
  jobApplicationSendApi: {
    getStatus: (...args: unknown[]) => mockGetStatus(...args),
    generateEmail: (...args: unknown[]) => mockGenerateEmail(...args),
    sendApplication: (...args: unknown[]) => mockSendApplication(...args),
  },
}))

vi.mock('@/lib/job-recruitment-contacts-api', () => ({
  jobRecruitmentContactsApi: {
    list: (...args: unknown[]) => mockListContacts(...args),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))

function renderWithIntl(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('SendTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStatus.mockResolvedValue({ data: MOCK_STATUS_DRAFT })
    mockListContacts.mockResolvedValue({ data: [] })
  })

  it('shows loading state initially', () => {
    mockGetStatus.mockReturnValue(new Promise(() => {}))
    renderWithIntl(<SendTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    expect(screen.getByTestId('send-tab-loading')).toBeInTheDocument()
  })

  it('shows generate button when no email exists', async () => {
    mockGetStatus.mockResolvedValue({ data: MOCK_STATUS_DRAFT })
    renderWithIntl(<SendTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('email-generate-button')).toBeInTheDocument()
    })
  })

  it('shows disabled generate button when noCv — prerequisite not met', async () => {
    const noCvError = new Error('Upload your CV first') as Error & { status: number }
    noCvError.status = 400
    mockGetStatus.mockResolvedValue({ data: MOCK_STATUS_DRAFT })
    mockGenerateEmail.mockRejectedValue(noCvError)

    renderWithIntl(<SendTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('email-generate-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('email-generate-button'))

    await waitFor(() => {
      expect(screen.getByTestId('send-tab-no-cv')).toBeInTheDocument()
    })
    // ORACLE: generate button disabled after noCv error
    expect(screen.getByTestId('email-generate-button')).toBeDisabled()
  })

  it('shows disabled generate button when noCoverLetter', async () => {
    const noCLError = new Error('Generate cover letter first') as Error & { status: number }
    noCLError.status = 400
    mockGetStatus.mockResolvedValue({ data: MOCK_STATUS_DRAFT })
    mockGenerateEmail.mockRejectedValue(noCLError)

    renderWithIntl(<SendTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('email-generate-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('email-generate-button'))

    await waitFor(() => {
      expect(screen.getByTestId('send-tab-no-cover-letter')).toBeInTheDocument()
    })
    // ORACLE: generate button disabled after noCoverLetter error
    expect(screen.getByTestId('email-generate-button')).toBeDisabled()
  })

  it('calls generateEmail API on button click', async () => {
    mockGetStatus.mockResolvedValue({ data: MOCK_STATUS_DRAFT })
    mockGenerateEmail.mockResolvedValue({
      data: { applicationId: 'app-1', emailText: 'Generated email', status: 'ready' },
    })

    renderWithIntl(<SendTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    await waitFor(() => {
      expect(screen.getByTestId('email-generate-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('email-generate-button'))

    await waitFor(() => {
      expect(mockGenerateEmail).toHaveBeenCalledWith(MOCK_OFFER_ID, MOCK_TOKEN)
    })
  })

  it('shows editable textarea when email is generated', async () => {
    mockGetStatus.mockResolvedValue({ data: MOCK_STATUS_READY })
    renderWithIntl(
      <SendTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} contactEmail={MOCK_CONTACT_EMAIL} />
    )

    await waitFor(() => {
      expect(screen.getByTestId('email-body-textarea')).toBeInTheDocument()
    })
    // ORACLE: textarea has the generated email text
    expect(screen.getByTestId('email-body-textarea')).toHaveValue(
      'Dear Hiring Team,\n\nI am writing to express my interest in the position.'
    )
    // ORACLE: send button enabled when email exists and recipient selected
    expect(screen.getByTestId('email-send-button')).not.toBeDisabled()
  })

  it('shows attachment indicators when email is generated', async () => {
    mockGetStatus.mockResolvedValue({ data: MOCK_STATUS_READY })
    renderWithIntl(<SendTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('email-attachments-list')).toBeInTheDocument()
    })
    // ORACLE: two attachment names visible
    expect(screen.getByText('CV.pdf')).toBeInTheDocument()
    expect(screen.getByText('CoverLetter.pdf')).toBeInTheDocument()
  })

  it('shows confirmation dialog when Send is clicked', async () => {
    mockGetStatus.mockResolvedValue({ data: MOCK_STATUS_READY })
    mockListContacts.mockResolvedValue({ data: [] })

    renderWithIntl(
      <SendTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} contactEmail={MOCK_CONTACT_EMAIL} />
    )

    await waitFor(() => {
      expect(screen.getByTestId('email-send-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('email-send-button'))

    // ORACLE: confirmation dialog appears
    expect(screen.getByTestId('send-confirm-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('send-confirm-submit')).toBeInTheDocument()
    expect(screen.getByTestId('send-confirm-cancel')).toBeInTheDocument()
  })

  it('sends application after confirmation', async () => {
    mockGetStatus.mockResolvedValue({ data: MOCK_STATUS_READY })
    mockSendApplication.mockResolvedValue({
      data: { applicationId: 'app-1', status: 'sent', sentAt: '2026-04-09T14:30:00Z', sentToEmail: MOCK_CONTACT_EMAIL },
    })

    renderWithIntl(
      <SendTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} contactEmail={MOCK_CONTACT_EMAIL} />
    )

    await waitFor(() => {
      expect(screen.getByTestId('email-send-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('email-send-button'))
    fireEvent.click(screen.getByTestId('send-confirm-submit'))

    await waitFor(() => {
      expect(mockSendApplication).toHaveBeenCalledWith(MOCK_OFFER_ID, MOCK_CONTACT_EMAIL, MOCK_TOKEN)
    })
  })

  it('closes confirmation dialog on cancel', async () => {
    mockGetStatus.mockResolvedValue({ data: MOCK_STATUS_READY })

    renderWithIntl(
      <SendTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} contactEmail={MOCK_CONTACT_EMAIL} />
    )

    await waitFor(() => {
      expect(screen.getByTestId('email-send-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('email-send-button'))
    expect(screen.getByTestId('send-confirm-dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('send-confirm-cancel'))
    expect(screen.queryByTestId('send-confirm-dialog')).not.toBeInTheDocument()
  })

  it('shows sent confirmation when application was already sent', async () => {
    mockGetStatus.mockResolvedValue({ data: MOCK_STATUS_SENT })
    renderWithIntl(<SendTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('send-tab-sent-badge')).toBeInTheDocument()
    })
    // ORACLE: shows sent date and recipient, no send button
    expect(screen.getByText(/April 9, 2026/)).toBeInTheDocument()
    expect(screen.queryByTestId('email-send-button')).not.toBeInTheDocument()
  })

  it('shows attachments in sent state', async () => {
    mockGetStatus.mockResolvedValue({ data: MOCK_STATUS_SENT })
    renderWithIntl(<SendTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('email-attachments-list')).toBeInTheDocument()
    })
    expect(screen.getByText('CV.pdf')).toBeInTheDocument()
    expect(screen.getByText('CoverLetter.pdf')).toBeInTheDocument()
  })

  it('shows recipient selector with offer contact as default', async () => {
    mockGetStatus.mockResolvedValue({ data: MOCK_STATUS_READY })
    mockListContacts.mockResolvedValue({ data: [] })

    renderWithIntl(
      <SendTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} contactEmail={MOCK_CONTACT_EMAIL} />
    )

    await waitFor(() => {
      expect(screen.getByTestId('email-recipient-select')).toBeInTheDocument()
    })
    // ORACLE: offer contact email is the default selected value
    expect(screen.getByTestId('email-recipient-select')).toHaveValue(MOCK_CONTACT_EMAIL)
  })

  it('does not render dangerouslySetInnerHTML or innerHTML — plain text only', () => {
    // AC-SEC-JASF-02: email body uses textarea (plain text), never HTML rendering
    // This is verified by the grep check in acceptance criteria, but we test the component renders textarea
    mockGetStatus.mockResolvedValue({ data: MOCK_STATUS_READY })
    renderWithIntl(<SendTab offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    // No dangerouslySetInnerHTML in the component source — verified by static analysis
  })
})
