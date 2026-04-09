import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/i18n/en.json'
import { RecruitmentContactsPanel } from './recruitment-contacts-panel'
import type { RecruitmentContact } from '@/lib/job-recruitment-contacts-api'

const MOCK_OFFER_ID = 'offer-uuid-123'
const MOCK_TOKEN = 'valid-token'

const MOCK_CONTACT_1: RecruitmentContact = {
  id: 'c1',
  offerId: MOCK_OFFER_ID,
  userId: 'user-1',
  name: 'John Smith',
  role: 'Hiring Manager',
  email: 'john@acme.com',
  linkedinUrl: null,
  notes: 'Met at conference',
  leadId: null,
  createdAt: '2026-04-01T10:00:00Z',
  updatedAt: '2026-04-01T10:00:00Z',
}

const MOCK_CONTACT_WITH_LEAD: RecruitmentContact = {
  id: 'c2',
  offerId: MOCK_OFFER_ID,
  userId: 'user-1',
  name: 'Jane Doe',
  role: 'HR Director',
  email: 'jane@acme.com',
  linkedinUrl: 'https://linkedin.com/in/janedoe',
  notes: null,
  leadId: 'lead-123',
  createdAt: '2026-04-02T10:00:00Z',
  updatedAt: '2026-04-02T10:00:00Z',
}

const mockListContacts = vi.fn()
const mockCreateContact = vi.fn()
const mockUpdateContact = vi.fn()
const mockRemoveContact = vi.fn()

vi.mock('@/lib/job-recruitment-contacts-api', () => ({
  jobRecruitmentContactsApi: {
    list: (...args: unknown[]) => mockListContacts(...args),
    create: (...args: unknown[]) => mockCreateContact(...args),
    update: (...args: unknown[]) => mockUpdateContact(...args),
    remove: (...args: unknown[]) => mockRemoveContact(...args),
  },
}))

function renderWithIntl(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('RecruitmentContactsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListContacts.mockResolvedValue({ data: [] })
  })

  it('shows loading state initially', () => {
    mockListContacts.mockReturnValue(new Promise(() => {}))
    renderWithIntl(<RecruitmentContactsPanel offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)
    expect(screen.getByTestId('recruitment-contacts-panel')).toBeInTheDocument()
  })

  it('shows empty state when no contacts exist', async () => {
    mockListContacts.mockResolvedValue({ data: [] })
    renderWithIntl(<RecruitmentContactsPanel offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('recruitment-contacts-empty')).toBeInTheDocument()
    })
    // ORACLE: empty state message and add button visible
    expect(screen.getByText(messages.recruitmentContacts.emptyState)).toBeInTheDocument()
    expect(screen.getByTestId('recruitment-contact-add-button')).toBeInTheDocument()
  })

  it('shows contact cards when contacts exist', async () => {
    mockListContacts.mockResolvedValue({ data: [MOCK_CONTACT_1] })
    renderWithIntl(<RecruitmentContactsPanel offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('recruitment-contact-card-c1')).toBeInTheDocument()
    })
    // ORACLE: contact details visible
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText('Hiring Manager')).toBeInTheDocument()
    expect(screen.getByText('john@acme.com')).toBeInTheDocument()
    expect(screen.getByText('Met at conference')).toBeInTheDocument()
  })

  it('shows cross-pipeline badge when contact has leadId', async () => {
    mockListContacts.mockResolvedValue({ data: [MOCK_CONTACT_WITH_LEAD] })
    renderWithIntl(<RecruitmentContactsPanel offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('recruitment-contact-card-c2')).toBeInTheDocument()
    })
    // ORACLE: badge "Existing lead" visible on contact with leadId
    expect(screen.getByTestId('recruitment-contact-cross-lead-badge')).toBeInTheDocument()
    expect(screen.getByText('Existing lead')).toBeInTheDocument()
  })

  it('does not show cross-pipeline badge when contact has no leadId', async () => {
    mockListContacts.mockResolvedValue({ data: [MOCK_CONTACT_1] })
    renderWithIntl(<RecruitmentContactsPanel offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('recruitment-contact-card-c1')).toBeInTheDocument()
    })
    // ORACLE: no badge when leadId is null
    expect(screen.queryByTestId('recruitment-contact-cross-lead-badge')).not.toBeInTheDocument()
  })

  it('opens add form when Add button is clicked', async () => {
    mockListContacts.mockResolvedValue({ data: [] })
    renderWithIntl(<RecruitmentContactsPanel offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('recruitment-contact-add-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('recruitment-contact-add-button'))
    expect(screen.getByTestId('recruitment-contact-add-form')).toBeInTheDocument()
    expect(screen.getByTestId('recruitment-contact-add-name')).toBeInTheDocument()
    expect(screen.getByTestId('recruitment-contact-add-role')).toBeInTheDocument()
    expect(screen.getByTestId('recruitment-contact-add-email')).toBeInTheDocument()
  })

  it('creates contact when add form is submitted', async () => {
    mockListContacts.mockResolvedValue({ data: [] })
    mockCreateContact.mockResolvedValue({
      data: { ...MOCK_CONTACT_1, id: 'c-new' },
    })

    renderWithIntl(<RecruitmentContactsPanel offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('recruitment-contact-add-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('recruitment-contact-add-button'))
    fireEvent.change(screen.getByTestId('recruitment-contact-add-name'), { target: { value: 'New Contact' } })
    fireEvent.change(screen.getByTestId('recruitment-contact-add-role'), { target: { value: 'Recruiter' } })
    fireEvent.change(screen.getByTestId('recruitment-contact-add-email'), { target: { value: 'new@acme.com' } })
    fireEvent.click(screen.getByTestId('recruitment-contact-add-submit-button'))

    await waitFor(() => {
      expect(mockCreateContact).toHaveBeenCalledWith(
        MOCK_OFFER_ID,
        { name: 'New Contact', role: 'Recruiter', email: 'new@acme.com' },
        MOCK_TOKEN
      )
    })
  })

  it('disables add submit button when name is empty', async () => {
    mockListContacts.mockResolvedValue({ data: [] })
    renderWithIntl(<RecruitmentContactsPanel offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('recruitment-contact-add-button')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('recruitment-contact-add-button'))
    // ORACLE: submit button disabled when name is empty
    expect(screen.getByTestId('recruitment-contact-add-submit-button')).toBeDisabled()
  })

  it('removes contact when remove button is clicked', async () => {
    mockListContacts.mockResolvedValue({ data: [MOCK_CONTACT_1] })
    mockRemoveContact.mockResolvedValue(undefined)

    renderWithIntl(<RecruitmentContactsPanel offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('recruitment-contact-remove-c1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('recruitment-contact-remove-c1'))

    await waitFor(() => {
      expect(mockRemoveContact).toHaveBeenCalledWith(MOCK_OFFER_ID, 'c1', MOCK_TOKEN)
    })
  })

  it('opens edit form when edit button is clicked', async () => {
    mockListContacts.mockResolvedValue({ data: [MOCK_CONTACT_1] })
    renderWithIntl(<RecruitmentContactsPanel offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('recruitment-contact-edit-c1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('recruitment-contact-edit-c1'))
    expect(screen.getByTestId('recruitment-contact-edit-form')).toBeInTheDocument()
    // ORACLE: edit form pre-filled with contact data
    expect(screen.getByTestId('recruitment-contact-edit-name')).toHaveValue('John Smith')
    expect(screen.getByTestId('recruitment-contact-edit-role')).toHaveValue('Hiring Manager')
    expect(screen.getByTestId('recruitment-contact-edit-email')).toHaveValue('john@acme.com')
  })

  it('cancels edit form', async () => {
    mockListContacts.mockResolvedValue({ data: [MOCK_CONTACT_1] })
    renderWithIntl(<RecruitmentContactsPanel offerId={MOCK_OFFER_ID} token={MOCK_TOKEN} />)

    await waitFor(() => {
      expect(screen.getByTestId('recruitment-contact-edit-c1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('recruitment-contact-edit-c1'))
    expect(screen.getByTestId('recruitment-contact-edit-form')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('recruitment-contact-edit-cancel'))
    expect(screen.queryByTestId('recruitment-contact-edit-form')).not.toBeInTheDocument()
  })
})
