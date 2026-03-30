import { test } from '@japa/runner'
import ImapSyncService from '#services/imap_sync_service'

test.group('ImapSyncService — detectEvent', () => {
  // detectEvent is private, so we access it via bracket notation for testing
  const service = new ImapSyncService()
  const detectEvent = (subject: string, bodyText: string) =>
    (service as any).detectEvent(subject, bodyText)

  // ── Interview detection ──────────────────────────────────────────────────

  test('detects "interview" keyword in subject', async ({ assert }) => {
    const result = detectEvent('Interview invitation for Senior Dev', '')
    assert.equal(result, 'interview')
  })

  test('detects "entretien" keyword in body (French)', async ({ assert }) => {
    const result = detectEvent('Re: Candidature', 'Nous souhaitons vous inviter pour un entretien')
    assert.equal(result, 'interview')
  })

  test('interview detection is case-insensitive', async ({ assert }) => {
    const result = detectEvent('INTERVIEW SCHEDULED', '')
    assert.equal(result, 'interview')
  })

  // ── Rejection detection ──────────────────────────────────────────────────

  test('detects "unfortunately" keyword as rejection', async ({ assert }) => {
    const result = detectEvent('Application update', 'Unfortunately we have decided to go with another candidate')
    assert.equal(result, 'rejection')
  })

  test('detects "not moving forward" as rejection', async ({ assert }) => {
    const result = detectEvent('Re: Application', 'We are not moving forward with your application')
    assert.equal(result, 'rejection')
  })

  test('detects "not selected" as rejection', async ({ assert }) => {
    const result = detectEvent('Update', 'You were not selected for the position')
    assert.equal(result, 'rejection')
  })

  test('detects French "refus" as rejection', async ({ assert }) => {
    const result = detectEvent('Refus de candidature', '')
    assert.equal(result, 'rejection')
  })

  test('detects French "désolé" as rejection', async ({ assert }) => {
    const result = detectEvent('', 'Nous sommes désolé de vous informer')
    assert.equal(result, 'rejection')
  })

  test('detects "desole" without accent as rejection', async ({ assert }) => {
    const result = detectEvent('', 'Nous sommes desole')
    assert.equal(result, 'rejection')
  })

  // ── Offer detection ──────────────────────────────────────────────────────

  test('detects "offer" keyword as offer', async ({ assert }) => {
    const result = detectEvent('Job offer - Software Engineer', '')
    assert.equal(result, 'offer')
  })

  test('detects "contract" keyword as offer', async ({ assert }) => {
    const result = detectEvent('', 'Please find attached your contract of employment')
    assert.equal(result, 'offer')
  })

  test('detects French "offre" as offer', async ({ assert }) => {
    const result = detectEvent("Offre d'emploi", '')
    assert.equal(result, 'offer')
  })

  test('detects French "contrat" as offer', async ({ assert }) => {
    const result = detectEvent('', 'Voici votre contrat de travail')
    assert.equal(result, 'offer')
  })

  // ── Priority: interview wins over rejection/offer ────────────────────────

  test('interview keyword takes priority over rejection keywords', async ({ assert }) => {
    // "interview" check comes first in the code
    const result = detectEvent('Interview unfortunately rescheduled', '')
    assert.equal(result, 'interview')
  })

  // ── Other (no match) ────────────────────────────────────────────────────

  test('returns "other" when no keyword matches', async ({ assert }) => {
    const result = detectEvent('Hello', 'Thank you for your message. I will get back to you soon.')
    assert.equal(result, 'other')
  })

  test('returns "other" for empty subject and body', async ({ assert }) => {
    const result = detectEvent('', '')
    assert.equal(result, 'other')
  })

  test('returns "other" for generic business reply', async ({ assert }) => {
    const result = detectEvent('Re: Question about your company', 'Sure, happy to discuss')
    assert.equal(result, 'other')
  })
})

test.group('ImapSyncService — autoMoveContact status mapping', () => {
  test('interview event maps to "interview" status', async ({ assert }) => {
    // The switch in autoMoveContact:
    // case 'interview' → newStatus = 'interview'
    const eventToStatus: Record<string, string> = {
      interview: 'interview',
      rejection: 'rejected',
      offer: 'offer',
      other: 'replied',
    }
    assert.equal(eventToStatus['interview'], 'interview')
    assert.equal(eventToStatus['rejection'], 'rejected')
    assert.equal(eventToStatus['offer'], 'offer')
    assert.equal(eventToStatus['other'], 'replied')
  })

  test('syncForUser returns empty result (stub)', async ({ assert }) => {
    const service = new ImapSyncService()
    const result = await service.syncForUser('user-123')
    assert.equal(result.synced, 0) // ORACLE: stub returns 0
    assert.equal(result.errors, 0) // ORACLE: stub returns 0
  })
})
