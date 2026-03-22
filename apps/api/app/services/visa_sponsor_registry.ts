import VisaSponsorRegistry from '#models/visa_sponsor_registry'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

export interface VisaCheckResult {
  isAccredited: boolean
  countries: string[]
  visaTypes: string[]
  matchedName?: string
  confidence: number // 0-1
}

export interface VisaSponsorRecord {
  companyName: string
  companyNameNormalized: string
  country: string
  visaType: string
  accreditedSince?: string
  rawData?: Record<string, unknown>
  sourceUrl?: string
}

// Legal suffixes to strip for fuzzy matching
const LEGAL_SUFFIXES =
  /\b(limited|ltd|pty|pty\s+ltd|inc|incorporated|corporation|corp|gmbh|sas|sarl|llc|plc|co\.|company|group|holdings|international|intl)\b\.?/gi

const SOURCE_URLS: Record<string, string> = {
  NZ: 'https://www.immigration.govt.nz/employ-migrants/legal-obligations-employers/aewv-employers/list-of-accredited-employers',
  UK: 'https://assets.publishing.service.gov.uk/media/register-of-licensed-sponsors-workers.csv',
  AU: 'https://immi.homeaffairs.gov.au/visas/working-in-australia/standard-business-sponsorship',
}

export default class VisaSponsorRegistryService {
  /**
   * Check if a company is an accredited visa sponsor for a given country.
   */
  async checkCompany(companyName: string, country: string): Promise<VisaCheckResult> {
    const normalized = this.normalizeCompanyName(companyName)

    const records = await VisaSponsorRegistry.query().where('country', country)

    if (records.length === 0) {
      return { isAccredited: false, countries: [], visaTypes: [], confidence: 0 }
    }

    let bestMatch: VisaSponsorRegistry | null = null
    let bestScore = 0

    for (const record of records) {
      const score = this.fuzzyMatch(normalized, record.companyNameNormalized)
      if (score > bestScore) {
        bestScore = score
        bestMatch = record
      }
    }

    if (!bestMatch || bestScore < 0.85) {
      return { isAccredited: false, countries: [], visaTypes: [], confidence: bestScore }
    }

    // Gather all visa types for this company
    const allRecords = await VisaSponsorRegistry.query()
      .where('country', country)
      .where('companyNameNormalized', bestMatch.companyNameNormalized)

    const visaTypes = [...new Set(allRecords.map((r) => r.visaType))]
    const countries = [...new Set(allRecords.map((r) => r.country))]

    return {
      isAccredited: true,
      countries,
      visaTypes,
      matchedName: bestMatch.companyName,
      confidence: bestScore,
    }
  }

  /**
   * Refresh the visa sponsor registry for a given country.
   * Returns the number of records upserted.
   */
  async refreshRegistry(country: 'NZ' | 'UK' | 'AU'): Promise<number> {
    let records: VisaSponsorRecord[] = []

    try {
      if (country === 'NZ') records = await this.fetchNzRegistry()
      else if (country === 'UK') records = await this.fetchUkRegistry()
      else if (country === 'AU') records = await this.fetchAuRegistry()
    } catch (err) {
      throw new Error(
        `Failed to fetch ${country} registry: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
    }

    if (records.length === 0) return 0

    // Batch upsert — delete existing for country then insert fresh
    await VisaSponsorRegistry.query().where('country', country).delete()

    const now = DateTime.now()
    const rows = records.map((r) => ({
      id: randomUUID(),
      country: r.country,
      companyName: r.companyName,
      companyNameNormalized: r.companyNameNormalized,
      visaType: r.visaType,
      accreditedSince: r.accreditedSince ? new Date(r.accreditedSince) : null,
      rawData: r.rawData ? JSON.stringify(r.rawData) : null,
      sourceUrl: r.sourceUrl ?? SOURCE_URLS[country] ?? null,
      indexedAt: now.toJSDate(),
    }))

    // Insert in batches of 500
    const batchSize = 500
    for (let i = 0; i < rows.length; i += batchSize) {
      await VisaSponsorRegistry.createMany(rows.slice(i, i + batchSize) as any)
    }

    return records.length
  }

  // ─── Private fetchers ────────────────────────────────────────────────────

  private async fetchNzRegistry(): Promise<VisaSponsorRecord[]> {
    // Immigration NZ publishes a downloadable CSV of AEWV accredited employers
    // URL may change — we attempt multiple known endpoints
    const urls = [
      'https://www.immigration.govt.nz/assets/employ-migrants/aewv-accredited-employers.csv',
      'https://www.immigration.govt.nz/assets/employers/accredited-employers.csv',
    ]

    for (const url of urls) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
        if (!res.ok) continue
        const text = await res.text()
        return this.parseCsv(text, 'NZ', 'AEWV', url)
      } catch {
        continue
      }
    }

    // Fallback: return empty (graceful degradation)
    return []
  }

  private async fetchUkRegistry(): Promise<VisaSponsorRecord[]> {
    // UK Home Office publishes a CSV of licensed sponsors — publicly available
    const url =
      'https://assets.publishing.service.gov.uk/media/register-of-licensed-sponsors-workers.csv'

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
      if (!res.ok) return []
      const text = await res.text()
      return this.parseCsv(text, 'UK', 'Skilled Worker', url)
    } catch {
      return []
    }
  }

  private async fetchAuRegistry(): Promise<VisaSponsorRecord[]> {
    // DOCA does not offer a clean CSV — graceful degradation with empty list
    // This would require browser automation or a paid data source
    // TODO: integrate when a reliable source is found
    return []
  }

  // ─── CSV parsing ─────────────────────────────────────────────────────────

  private parseCsv(
    csv: string,
    country: string,
    visaType: string,
    sourceUrl: string
  ): VisaSponsorRecord[] {
    const lines = csv.split('\n').filter((l) => l.trim())
    if (lines.length < 2) return []

    const records: VisaSponsorRecord[] = []

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvLine(lines[i])
      const companyName = cols[0]?.trim()
      if (!companyName || companyName.length < 2) continue

      records.push({
        companyName,
        companyNameNormalized: this.normalizeCompanyName(companyName),
        country,
        visaType,
        accreditedSince: cols[2]?.trim() || undefined,
        rawData: { rawLine: lines[i] },
        sourceUrl,
      })
    }

    return records
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = []
    let inQuotes = false
    let current = ''

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }

  // ─── Normalization & matching ─────────────────────────────────────────────

  normalizeCompanyName(name: string): string {
    return name
      .toLowerCase()
      .replace(LEGAL_SUFFIXES, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Levenshtein distance normalized by max string length.
   * Returns 0 (no match) to 1 (exact match).
   */
  fuzzyMatch(a: string, b: string): number {
    if (a === b) return 1
    if (!a || !b) return 0

    const maxLen = Math.max(a.length, b.length)
    if (maxLen === 0) return 1

    const distance = this.levenshtein(a, b)
    return 1 - distance / maxLen
  }

  private levenshtein(a: string, b: string): number {
    const m = a.length
    const n = b.length
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    )

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1]
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
        }
      }
    }

    return dp[m][n]
  }
}
