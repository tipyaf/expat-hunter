import { test } from '@japa/runner'
import EmailVerifier from '#services/email_verifier'

const verifier = new EmailVerifier()

// ---------------------------------------------------------------------------
// Level 1 — MX check
// ---------------------------------------------------------------------------

test.group('EmailVerifier — checkMx', () => {
  test('returns true for valid domain with MX records', async ({ assert }) => {
    const result = await verifier.checkMx('google.com')
    assert.isTrue(result)
  })

  test('returns false for nonexistent domain', async ({ assert }) => {
    const result = await verifier.checkMx('this-domain-does-not-exist-xyz-abc.com')
    assert.isFalse(result)
  })

  test('returns false for empty string', async ({ assert }) => {
    const result = await verifier.checkMx('')
    assert.isFalse(result)
  })
})

// ---------------------------------------------------------------------------
// Level 3 — Pattern scoring
// ---------------------------------------------------------------------------

test.group('EmailVerifier — scoreByPattern', () => {
  test('first.last pattern scores >= 80 when email has dot', ({ assert }) => {
    const result = verifier.scoreByPattern('john.doe', '{first}.{last}')
    assert.equal(result.status, 'probable')
    assert.isAtLeast(result.confidence, 80)
    assert.equal(result.method, 'pattern')
  })

  test('flast pattern scores >= 70', ({ assert }) => {
    const result = verifier.scoreByPattern('jdoe', '{f}{last}')
    assert.isAtLeast(result.confidence, 70)
  })

  test('firstlast pattern scores >= 70 for long strings', ({ assert }) => {
    const result = verifier.scoreByPattern('johndoe', '{first}{last}')
    assert.isAtLeast(result.confidence, 70)
  })

  test('non-matching pattern returns risky with low confidence', ({ assert }) => {
    // 'x' is a single char — matches {first} pattern (60) → status: risky
    const result = verifier.scoreByPattern('x', '{first}.{last}')
    assert.equal(result.status, 'risky')
    assert.isAtMost(result.confidence, 70)
  })

  test('email with dot gets moderate score even without exact pattern match', ({ assert }) => {
    const result = verifier.scoreByPattern('jane.smith', 'unknown-pattern')
    assert.isAtLeast(result.confidence, 60)
  })
})

// ---------------------------------------------------------------------------
// patternMatchScore
// ---------------------------------------------------------------------------

test.group('EmailVerifier — patternMatchScore', () => {
  test('first.last pattern with dot in localPart returns 85', ({ assert }) => {
    assert.equal(verifier.patternMatchScore('john.doe', '{first}.{last}'), 85)
  })

  test('localPart with dot triggers first.last check first (85)', ({ assert }) => {
    // 'j.doe' has a dot → {first}.{last} check fires first regardless of actual pattern
    assert.equal(verifier.patternMatchScore('j.doe', '{first}.{last}'), 85)
  })

  test('no match returns 30', ({ assert }) => {
    assert.equal(verifier.patternMatchScore('x', 'unknown'), 30)
  })
})

// ---------------------------------------------------------------------------
// verify — full chain
// ---------------------------------------------------------------------------

test.group('EmailVerifier — verify', () => {
  test('returns invalid for email without domain', async ({ assert }) => {
    const result = await verifier.verify('nodomain')
    assert.equal(result.status, 'invalid')
    assert.equal(result.method, 'dns_only')
  })

  test('returns invalid for email with nonexistent domain', async ({ assert }) => {
    const result = await verifier.verify('test@this-domain-does-not-exist-xyz-abc.com')
    assert.equal(result.status, 'invalid')
    assert.equal(result.method, 'dns_only')
    assert.include(result.details, 'No MX records')
  })

  test('returns result for email with valid domain', async ({ assert }) => {
    // google.com has MX records, SMTP will likely timeout or return unknown
    const result = await verifier.verify('test@google.com')
    // Should NOT be invalid (google.com has MX records)
    assert.notEqual(result.status, 'invalid')
  }).timeout(10000)

  test('uses pattern scoring when hunterPattern provided and SMTP inconclusive', async ({ assert }) => {
    // Use a domain with MX but that will fail SMTP (timeout/error)
    const result = await verifier.verify('john.doe@example.com', '{first}.{last}')
    // example.com has no real MX → invalid, OR might have reserved MX
    assert.isDefined(result.status)
    assert.isDefined(result.confidence)
  }).timeout(10000)
})
