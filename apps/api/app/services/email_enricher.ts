import dns from 'node:dns/promises'
import env from '#start/env'
import CacheService from '#services/cache_service'
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

interface ApolloPersonResponse {
  person?: { email: string | null; email_status?: string } | null
}

export default class EmailEnricher {
  private cache = new CacheService()
  private hunterApiKey = env.get('HUNTER_API_KEY')
  private apolloApiKey = env.get('APOLLO_API_KEY')

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

    // Step 2 — Apollo.io
    if (this.apolloApiKey) {
      const apolloEmail = await this.tryApollo(fullName, domain)
      if (apolloEmail) {
        return { email: apolloEmail, source: 'apollo', confidence: 80, status: 'probable', alternatives: [] }
      }
    }

    // Step 3 — Pattern inference
    const patterns = this.inferEmailPatterns(firstName, lastName, domain)
    const mxValid = await this.verifyMx(domain)

    if (!mxValid || patterns.length === 0) {
      return { email: null, source: 'inferred', confidence: 0, status: 'unknown', alternatives: [] }
    }

    return {
      email: patterns[0],
      source: 'inferred',
      confidence: 40,
      status: 'probable',
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

  private async tryApollo(fullName: string, domain: string): Promise<string | null> {
    const cacheKey = `apollo::${fullName.toLowerCase()}@${domain}`

    try {
      const result = await this.cache.getOrFetch<{ email: string | null }>(
        'apollo',
        'contact',
        cacheKey,
        async () => {
          const res = await fetch('https://api.apollo.io/v1/people/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': this.apolloApiKey! },
            body: JSON.stringify({ name: fullName, domain }),
            signal: AbortSignal.timeout(8000),
          })

          if (!res.ok) return { email: null }

          const json = (await res.json()) as ApolloPersonResponse
          return { email: json.person?.email ?? null }
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

  private async verifyMx(domain: string): Promise<boolean> {
    try {
      const records = await dns.resolveMx(domain)
      return records.length > 0
    } catch {
      return false
    }
  }

  private parseFullName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length < 2) return { firstName: parts[0] ?? '', lastName: '' }
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
  }
}
