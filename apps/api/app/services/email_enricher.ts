import env from '#start/env'
import CacheService from '#services/cache_service'
import EmailVerifier from '#services/email_verifier'
import type { EmailSource } from '#models/contact'

export interface EmailEnrichmentResult {
  email: string | null
  source: EmailSource
  confidence: number
  status: 'verified' | 'probable' | 'unknown'
  alternatives: string[]
}

interface HunterFinderResponse {
  data?: { email: string | null; score: number } | null
}

export default class EmailEnricher {
  private cache = new CacheService()
  private verifier = new EmailVerifier()
  private hunterApiKey = env.get('HUNTER_API_KEY')

  async enrich(fullName: string, domain: string): Promise<EmailEnrichmentResult> {
    const { firstName, lastName } = this.parseFullName(fullName)

    if (!firstName || !lastName) {
      return { email: null, source: 'inferred', confidence: 0, status: 'unknown', alternatives: [] }
    }

    // Step 1 — Hunter.io
    if (this.hunterApiKey) {
      const hunterEmail = await this.tryHunter(firstName, lastName, domain)
      if (hunterEmail) {
        return { email: hunterEmail, source: 'hunter', confidence: 90, status: 'verified', alternatives: [] }
      }
    }

    // Step 2 — Pattern inference with verification
    const patterns = this.inferEmailPatterns(firstName, lastName, domain)
    const mxValid = await this.verifier.checkMx(domain)

    if (!mxValid || patterns.length === 0) {
      return { email: null, source: 'inferred', confidence: 0, status: 'unknown', alternatives: [] }
    }

    // Try SMTP verification on the first pattern
    const bestPattern = patterns[0]
    const verification = await this.verifier.verify(bestPattern)

    return {
      email: bestPattern,
      source: 'inferred',
      confidence: verification.confidence,
      status: verification.status === 'verified' ? 'verified'
        : verification.status === 'invalid' ? 'unknown'
        : 'probable',
      alternatives: patterns.slice(1),
    }
  }

  private async tryHunter(firstName: string, lastName: string, domain: string): Promise<string | null> {
    const cacheKey = `hunter::${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`

    try {
      const result = await this.cache.getOrFetch<{ email: string | null; score: number }>(
        'hunter',
        'contact',
        cacheKey,
        async () => {
          const url = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${this.hunterApiKey}`
          const res = await fetch(url, { signal: AbortSignal.timeout(8000) })

          if (!res.ok) return { email: null, score: 0 }

          const json = (await res.json()) as HunterFinderResponse
          return { email: json.data?.email ?? null, score: json.data?.score ?? 0 }
        },
        14
      )
      return result.data.email
    } catch {
      return null
    }
  }

  private inferEmailPatterns(firstName: string, lastName: string, domain: string): string[] {
    const f = firstName.toLowerCase().replace(/[^a-z]/g, '')
    const l = lastName.toLowerCase().replace(/[^a-z]/g, '')

    return [
      `${f}.${l}@${domain}`,
      `${f}${l}@${domain}`,
      `${f[0]}.${l}@${domain}`,
      `${f[0]}${l}@${domain}`,
      `${f}@${domain}`,
    ]
  }

  private parseFullName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length < 2) return { firstName: parts[0] ?? '', lastName: '' }
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
  }
}
