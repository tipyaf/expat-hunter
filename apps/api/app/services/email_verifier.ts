/**
 * EmailVerifier — 3-level email verification service.
 *
 * Level 1: MX DNS check (free, confirms domain accepts email)
 * Level 2: SMTP handshake (free, confirms mailbox exists — but unreliable on catch-all/greylisting)
 * Level 3: Pattern scoring (uses Hunter domain stats to score inferred emails)
 *
 * NEVER marks invalid on timeout — catch-all and greylisting produce timeouts on valid emails.
 */
import dns from 'node:dns/promises'
import { createConnection } from 'node:net'

export type VerifyStatus = 'verified' | 'probable' | 'risky' | 'invalid' | 'unknown'
export type VerifyMethod = 'smtp' | 'hunter' | 'pattern' | 'dns_only'

export interface VerificationResult {
  status: VerifyStatus
  confidence: number
  method: VerifyMethod
  details: string
}

const SMTP_TIMEOUT_MS = 5000
const COMMON_PATTERNS = [
  '{first}.{last}',
  '{first}{last}',
  '{f}.{last}',
  '{f}{last}',
  '{first}',
  '{last}.{first}',
  '{first}_{last}',
]

export default class EmailVerifier {
  /**
   * Full verification chain: MX → SMTP → pattern scoring
   */
  async verify(email: string, hunterPattern?: string): Promise<VerificationResult> {
    const domain = email.split('@')[1]
    if (!domain) {
      return { status: 'invalid', confidence: 0, method: 'dns_only', details: 'No domain in email' }
    }

    // Level 1 — MX check
    const mxValid = await this.checkMx(domain)
    if (!mxValid) {
      return { status: 'invalid', confidence: 95, method: 'dns_only', details: 'No MX records for domain' }
    }

    // Level 2 — SMTP handshake
    const smtpResult = await this.smtpVerify(email, domain)
    if (smtpResult.status === 'verified' || smtpResult.status === 'invalid') {
      return smtpResult
    }

    // Level 3 — Pattern scoring (if SMTP was inconclusive)
    if (hunterPattern) {
      return this.scoreByPattern(email, hunterPattern)
    }

    // MX valid but SMTP inconclusive and no pattern → probable
    return { status: 'probable', confidence: 40, method: 'dns_only', details: 'MX valid, SMTP inconclusive' }
  }

  /**
   * Level 1 — DNS MX check. Returns true if domain has MX records.
   */
  async checkMx(domain: string): Promise<boolean> {
    try {
      const records = await dns.resolveMx(domain)
      return records.length > 0
    } catch {
      return false
    }
  }

  /**
   * Level 2 — SMTP handshake (EHLO → MAIL FROM → RCPT TO).
   * Returns verified (250), invalid (550/551/553), or unknown (timeout/other).
   * NEVER returns invalid on timeout — catch-all servers and greylisting produce timeouts.
   */
  async smtpVerify(email: string, domain: string): Promise<VerificationResult> {
    try {
      const mxRecords = await dns.resolveMx(domain)
      if (mxRecords.length === 0) {
        return { status: 'invalid', confidence: 90, method: 'smtp', details: 'No MX records' }
      }

      const mxHost = mxRecords.sort((a, b) => a.priority - b.priority)[0].exchange
      const response = await this.smtpHandshake(mxHost, email)

      if (response.code >= 200 && response.code < 300) {
        return { status: 'verified', confidence: 95, method: 'smtp', details: `SMTP 2xx: ${response.message}` }
      }

      if (response.code >= 500 && response.code < 560) {
        return { status: 'invalid', confidence: 90, method: 'smtp', details: `SMTP 5xx: ${response.message}` }
      }

      // 4xx = soft reject (greylisting, rate limiting) → unknown, NOT invalid
      return { status: 'unknown', confidence: 30, method: 'smtp', details: `SMTP ${response.code}: ${response.message}` }
    } catch (err) {
      // Timeout or connection error → unknown, NEVER invalid
      const msg = err instanceof Error ? err.message : 'Unknown error'
      return { status: 'unknown', confidence: 20, method: 'smtp', details: `SMTP error: ${msg}` }
    }
  }

  /**
   * Level 3 — Pattern scoring. Uses Hunter domain pattern to score inferred emails.
   * If the email matches the dominant pattern, confidence is higher.
   */
  scoreByPattern(email: string, hunterPattern: string): VerificationResult {
    const localPart = email.split('@')[0]?.toLowerCase() ?? ''
    const normalizedPattern = hunterPattern.toLowerCase()

    // Check if email structure matches common patterns
    const matchScore = this.patternMatchScore(localPart, normalizedPattern)

    if (matchScore >= 80) {
      return { status: 'probable', confidence: matchScore, method: 'pattern', details: `Matches pattern: ${hunterPattern}` }
    }

    if (matchScore >= 50) {
      return { status: 'risky', confidence: matchScore, method: 'pattern', details: `Partial pattern match: ${hunterPattern}` }
    }

    return { status: 'risky', confidence: 30, method: 'pattern', details: `Does not match pattern: ${hunterPattern}` }
  }

  /**
   * Score how well an email local part matches a known pattern.
   */
  patternMatchScore(localPart: string, pattern: string): number {
    // Direct pattern format match
    if (pattern.includes('{first}.{last}') && localPart.includes('.')) return 85
    if (pattern.includes('{f}{last}') && /^[a-z][a-z]+$/.test(localPart)) return 75
    if (pattern.includes('{first}{last}') && /^[a-z]+$/.test(localPart) && localPart.length > 4) return 70
    if (pattern.includes('{first}') && /^[a-z]+$/.test(localPart)) return 60

    // Fallback: if has a dot separator, likely first.last pattern
    if (localPart.includes('.')) return 65

    return 30
  }

  /**
   * Low-level SMTP handshake. Connects to MX server, sends EHLO/MAIL FROM/RCPT TO.
   */
  private smtpHandshake(mxHost: string, email: string): Promise<{ code: number; message: string }> {
    return new Promise((resolve, reject) => {
      const socket = createConnection({ host: mxHost, port: 25, timeout: SMTP_TIMEOUT_MS })
      let step = 0
      let buffer = ''

      const timeout = setTimeout(() => {
        socket.destroy()
        reject(new Error('SMTP timeout'))
      }, SMTP_TIMEOUT_MS)

      socket.on('data', (data) => {
        buffer += data.toString()

        // Wait for complete response (ends with \r\n)
        if (!buffer.endsWith('\r\n') && !buffer.endsWith('\n')) return

        const code = parseInt(buffer.substring(0, 3), 10)
        const message = buffer.trim()
        buffer = ''

        if (step === 0 && code >= 200 && code < 300) {
          // Server greeting → send EHLO
          step = 1
          socket.write('EHLO expat-hunter.com\r\n')
        } else if (step === 1 && code >= 200 && code < 300) {
          // EHLO accepted → send MAIL FROM
          step = 2
          socket.write('MAIL FROM:<verify@expat-hunter.com>\r\n')
        } else if (step === 2 && code >= 200 && code < 300) {
          // MAIL FROM accepted → send RCPT TO
          step = 3
          socket.write(`RCPT TO:<${email}>\r\n`)
        } else if (step === 3) {
          // RCPT TO response — this is what we care about
          clearTimeout(timeout)
          socket.write('QUIT\r\n')
          socket.end()
          resolve({ code, message })
        } else {
          // Unexpected response
          clearTimeout(timeout)
          socket.destroy()
          resolve({ code, message })
        }
      })

      socket.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })

      socket.on('timeout', () => {
        clearTimeout(timeout)
        socket.destroy()
        reject(new Error('SMTP socket timeout'))
      })
    })
  }
}
