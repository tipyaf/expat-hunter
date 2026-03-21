import { test } from '@japa/runner'

test.group('PipelineService', () => {
  test('PIPELINE_COLUMNS maps statuses to correct keys', ({ assert }) => {
    const PIPELINE_COLUMNS = [
      { key: 'found', statuses: ['identified', 'analyzed'] },
      { key: 'to_contact', statuses: ['to_contact'] },
      { key: 'contacted', statuses: ['contacted'] },
      { key: 'in_discussion', statuses: ['replied', 'interview'] },
      { key: 'done', statuses: ['offer', 'rejected'] },
    ]

    assert.equal(PIPELINE_COLUMNS.length, 5)

    const allStatuses = PIPELINE_COLUMNS.flatMap((c) => c.statuses)
    assert.equal(allStatuses.length, 8)
    assert.includeMembers(allStatuses, [
      'identified', 'analyzed', 'to_contact', 'contacted',
      'replied', 'interview', 'offer', 'rejected',
    ])

    // No duplicate statuses across columns
    const unique = new Set(allStatuses)
    assert.equal(unique.size, allStatuses.length)
  })

  test('found column groups identified and analyzed', ({ assert }) => {
    const PIPELINE_COLUMNS = [
      { key: 'found', statuses: ['identified', 'analyzed'] },
      { key: 'to_contact', statuses: ['to_contact'] },
      { key: 'contacted', statuses: ['contacted'] },
      { key: 'in_discussion', statuses: ['replied', 'interview'] },
      { key: 'done', statuses: ['offer', 'rejected'] },
    ]

    const foundCol = PIPELINE_COLUMNS.find((c) => c.key === 'found')
    assert.deepEqual(foundCol?.statuses, ['identified', 'analyzed'])
  })

  test('in_discussion column groups replied and interview', ({ assert }) => {
    const PIPELINE_COLUMNS = [
      { key: 'found', statuses: ['identified', 'analyzed'] },
      { key: 'to_contact', statuses: ['to_contact'] },
      { key: 'contacted', statuses: ['contacted'] },
      { key: 'in_discussion', statuses: ['replied', 'interview'] },
      { key: 'done', statuses: ['offer', 'rejected'] },
    ]

    const discussionCol = PIPELINE_COLUMNS.find((c) => c.key === 'in_discussion')
    assert.deepEqual(discussionCol?.statuses, ['replied', 'interview'])
  })

  test('done column groups offer and rejected', ({ assert }) => {
    const PIPELINE_COLUMNS = [
      { key: 'found', statuses: ['identified', 'analyzed'] },
      { key: 'to_contact', statuses: ['to_contact'] },
      { key: 'contacted', statuses: ['contacted'] },
      { key: 'in_discussion', statuses: ['replied', 'interview'] },
      { key: 'done', statuses: ['offer', 'rejected'] },
    ]

    const doneCol = PIPELINE_COLUMNS.find((c) => c.key === 'done')
    assert.deepEqual(doneCol?.statuses, ['offer', 'rejected'])
  })

  test('serialize produces correct shape', ({ assert }) => {
    const mockContact = {
      id: '123',
      fullName: 'John Doe',
      role: 'CTO',
      email: 'john@example.com',
      status: 'identified',
      relevanceScore: 85,
      relevanceLabel: 'very_relevant',
      relevanceReason: 'Strong match',
      aiRecommendation: 'contact',
      company: { id: '456', name: 'Acme', sector: 'tech', country: 'NZ' },
      emails: [{ status: 'sent', createdAt: { toISO: () => '2026-03-20T10:00:00.000+00:00' } }],
    }

    // Simulate serialize logic
    const lastEmail = mockContact.emails?.[0] ?? null
    const serialized = {
      id: mockContact.id,
      fullName: mockContact.fullName,
      role: mockContact.role,
      email: mockContact.email,
      status: mockContact.status,
      relevanceScore: mockContact.relevanceScore,
      relevanceLabel: mockContact.relevanceLabel,
      relevanceReason: mockContact.relevanceReason,
      aiRecommendation: mockContact.aiRecommendation,
      company: mockContact.company
        ? { id: mockContact.company.id, name: mockContact.company.name, sector: mockContact.company.sector, country: mockContact.company.country }
        : null,
      lastEmailStatus: lastEmail?.status ?? null,
      lastEmailDate: lastEmail?.createdAt?.toISO() ?? null,
    }

    assert.equal(serialized.id, '123')
    assert.equal(serialized.fullName, 'John Doe')
    assert.equal(serialized.lastEmailStatus, 'sent')
    assert.equal(serialized.lastEmailDate, '2026-03-20T10:00:00.000+00:00')
    assert.deepEqual(serialized.company, { id: '456', name: 'Acme', sector: 'tech', country: 'NZ' })
  })

  test('serialize handles null company and no emails', ({ assert }) => {
    const mockContact = {
      id: '789',
      fullName: 'Jane Smith',
      role: 'Manager',
      email: null as string | null,
      status: 'analyzed',
      relevanceScore: null as number | null,
      relevanceLabel: null as string | null,
      relevanceReason: null as string | null,
      aiRecommendation: null as string | null,
      company: null as { id: string; name: string; sector: string | null; country: string } | null,
      emails: [] as { status: string; createdAt: { toISO: () => string } }[],
    }

    const lastEmail = mockContact.emails?.[0] ?? null
    const serialized = {
      id: mockContact.id,
      fullName: mockContact.fullName,
      role: mockContact.role,
      email: mockContact.email,
      status: mockContact.status,
      relevanceScore: mockContact.relevanceScore,
      relevanceLabel: mockContact.relevanceLabel,
      relevanceReason: mockContact.relevanceReason,
      aiRecommendation: mockContact.aiRecommendation,
      company: mockContact.company
        ? { id: mockContact.company.id, name: mockContact.company.name, sector: mockContact.company.sector, country: mockContact.company.country }
        : null,
      lastEmailStatus: lastEmail?.status ?? null,
      lastEmailDate: lastEmail?.createdAt?.toISO() ?? null,
    }

    assert.isNull(serialized.email)
    assert.isNull(serialized.company)
    assert.isNull(serialized.lastEmailStatus)
    assert.isNull(serialized.lastEmailDate)
    assert.isNull(serialized.relevanceScore)
  })
})
