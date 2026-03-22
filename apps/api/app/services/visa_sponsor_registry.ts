import VisaSponsorRegistry from '#models/visa_sponsor_registry'
import CacheService from './cache_service.js'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

export interface VisaCheckResult {
  isAccredited: boolean
  countries: string[]
  visaTypes: string[]
  matchedName?: string
  confidence: number // 0-1
  source?: string
}

export interface VisaSponsorRecord {
  companyName: string
  companyNameNormalized: string
  country: string
  visaType: string
  accreditedSince?: string
  expiresAt?: string
  rawData?: Record<string, unknown>
  sourceUrl?: string
}

// Legal suffixes to strip for fuzzy matching
const LEGAL_SUFFIXES =
  /\b(limited|ltd|pty|pty\s+ltd|inc|incorporated|corporation|corp|gmbh|sas|sarl|llc|plc|co\.|company|group|holdings|international|intl)\b\.?/gi

const SOURCE_URLS: Record<string, string> = {
  NZ: 'https://www.immigration.govt.nz/work/requirements-for-work-visas/approved-employers/accredited-employer-list/',
  UK: 'https://assets.publishing.service.gov.uk/media/register-of-licensed-sponsors-workers.csv',
  US: 'https://www.dol.gov/agencies/eta/foreign-labor/performance',
  AU: 'https://immi.homeaffairs.gov.au/visas/working-in-australia/standard-business-sponsorship',
}

const NZ_API_URL = 'https://www.immigration.govt.nz/list-api/getAPIResults/'
const US_DOL_LCA_URL =
  'https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/LCA_Disclosure_Data_FY2025_Q4.xlsx'

export default class VisaSponsorRegistryService {
  private cacheService = new CacheService()

  /**
   * Check if a company is an accredited visa sponsor for a given country.
   * Uses on-demand API checks for NZ and US, with caching.
   * Falls back to local registry table for UK and other pre-loaded countries.
   */
  async checkCompany(companyName: string, country: string): Promise<VisaCheckResult> {
    // On-demand checks for NZ and US — query the government API directly
    if (country === 'NZ' || country === 'New Zealand') {
      return this.checkNZ(companyName)
    }
    if (country === 'US' || country === 'United States' || country === 'USA') {
      return this.checkUS(companyName)
    }

    // For other countries (UK, AU, etc.) — use the local registry table
    return this.checkFromRegistry(companyName, country)
  }

  /**
   * Check NZ accredited employer status via Immigration NZ API.
   * The API is at POST /list-api/getAPIResults/ with multipart form data.
   * Results are cached for 30 days in external_cache.
   */
  async checkNZ(companyName: string): Promise<VisaCheckResult> {
    const cacheKey = `nz:${this.normalizeCompanyName(companyName)}`
    const notFoundResult: VisaCheckResult = {
      isAccredited: false,
      countries: [],
      visaTypes: [],
      confidence: 0,
      source: 'immigration.govt.nz',
    }

    try {
      const { data, fromCache } = await this.cacheService.getOrFetch(
        'immigration-nz',
        'visa',
        cacheKey,
        async () => {
          const result = await this.queryNzApi(companyName)
          return result as unknown as Record<string, unknown>
        },
        30
      )

      const result = data as unknown as VisaCheckResult
      if (fromCache) return result
      return result
    } catch (err) {
      // Graceful degradation: if the API is down, try local registry
      const registryResult = await this.checkFromRegistry(companyName, 'NZ').catch(() => null)
      if (registryResult && registryResult.isAccredited) return registryResult
      return notFoundResult
    }
  }

  /**
   * Query the NZ Immigration accredited employer API.
   */
  private async queryNzApi(companyName: string): Promise<VisaCheckResult> {
    const normalized = this.normalizeCompanyName(companyName)

    // Build multipart form data manually (Node 22 supports FormData natively)
    const formData = new FormData()
    formData.append('query', companyName)
    formData.append('collection', '2')
    formData.append('page', '1')

    const res = await fetch(NZ_API_URL, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json, text/plain, */*',
        Origin: 'https://www.immigration.govt.nz',
        Referer:
          'https://www.immigration.govt.nz/work/requirements-for-work-visas/approved-employers/accredited-employer-list/',
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      throw new Error(`NZ Immigration API returned ${res.status}`)
    }

    const json = (await res.json()) as {
      results: string
      current: number
      totalPages: number
      totalResults: number
    }

    if (!json.results || json.totalResults === 0) {
      return {
        isAccredited: false,
        countries: [],
        visaTypes: [],
        confidence: 0,
        source: 'immigration.govt.nz',
      }
    }

    // results is a JSON string containing an array of employer objects
    const results = JSON.parse(json.results) as Array<{
      field_schema: {
        raw: Array<{ APIColumn: string; Value: string }>
      }
      title: { raw: string }
      id: { raw: number }
    }>

    if (results.length === 0) {
      return {
        isAccredited: false,
        countries: [],
        visaTypes: [],
        confidence: 0,
        source: 'immigration.govt.nz',
      }
    }

    // Find the best match among results
    let bestMatch: (typeof results)[0] | null = null
    let bestScore = 0

    for (const result of results) {
      const employerName =
        result.field_schema.raw.find((f) => f.APIColumn === 'employerName')?.Value ?? ''
      const tradingName =
        result.field_schema.raw.find((f) => f.APIColumn === 'tradingName')?.Value ?? ''

      const scoreEmployer = this.fuzzyMatch(normalized, this.normalizeCompanyName(employerName))
      const scoreTrading = this.fuzzyMatch(normalized, this.normalizeCompanyName(tradingName))
      const score = Math.max(scoreEmployer, scoreTrading)

      if (score > bestScore) {
        bestScore = score
        bestMatch = result
      }
    }

    if (!bestMatch || bestScore < 0.7) {
      return {
        isAccredited: false,
        countries: [],
        visaTypes: [],
        confidence: bestScore,
        source: 'immigration.govt.nz',
      }
    }

    const matchedName =
      bestMatch.field_schema.raw.find((f) => f.APIColumn === 'employerName')?.Value ?? ''
    const expiryDate =
      bestMatch.field_schema.raw.find((f) => f.APIColumn === 'expiryDateOfAccreditation')?.Value ??
      ''

    // Check if accreditation has expired
    if (expiryDate) {
      const expiry = DateTime.fromISO(expiryDate)
      if (expiry.isValid && expiry < DateTime.now()) {
        return {
          isAccredited: false,
          countries: ['NZ'],
          visaTypes: ['AEWV'],
          matchedName,
          confidence: bestScore,
          source: 'immigration.govt.nz',
        }
      }
    }

    return {
      isAccredited: true,
      countries: ['NZ'],
      visaTypes: ['AEWV'],
      matchedName,
      confidence: bestScore,
      source: 'immigration.govt.nz',
    }
  }

  /**
   * Check US H-1B visa sponsor status.
   * Uses the DOL LCA disclosure data to verify if a company has approved H-1B petitions.
   * Since the full DOL dataset is very large (Excel), we use a two-tier approach:
   * 1. Check local registry (populated via refreshRegistry)
   * 2. If no local data, query the H1B Grader API as a fallback
   * Results are cached for 90 days.
   */
  async checkUS(companyName: string): Promise<VisaCheckResult> {
    const cacheKey = `us:${this.normalizeCompanyName(companyName)}`
    const notFoundResult: VisaCheckResult = {
      isAccredited: false,
      countries: [],
      visaTypes: [],
      confidence: 0,
      source: 'dol.gov/lca',
    }

    try {
      const { data } = await this.cacheService.getOrFetch(
        'dol-h1b',
        'visa',
        cacheKey,
        async () => {
          const result = await this.queryUsH1b(companyName)
          return result as unknown as Record<string, unknown>
        },
        90
      )

      return data as unknown as VisaCheckResult
    } catch {
      // Fallback to local registry
      const registryResult = await this.checkFromRegistry(companyName, 'US').catch(() => null)
      if (registryResult && registryResult.isAccredited) return registryResult
      return notFoundResult
    }
  }

  /**
   * Query US H-1B sponsor data.
   * First checks the local registry (populated from DOL data via refreshRegistry).
   * If not found locally, attempts the public H1BGrader API for on-demand lookups.
   */
  private async queryUsH1b(companyName: string): Promise<VisaCheckResult> {
    // First try local registry
    const registryResult = await this.checkFromRegistry(companyName, 'US').catch(() => null)
    if (registryResult && registryResult.isAccredited) {
      return { ...registryResult, source: 'dol.gov/lca' }
    }

    // Fallback: try the public H1BGrader search API
    try {
      return await this.queryH1bGraderApi(companyName)
    } catch {
      // If all sources fail, return not_found
      return {
        isAccredited: false,
        countries: [],
        visaTypes: [],
        confidence: 0,
        source: 'dol.gov/lca',
      }
    }
  }

  /**
   * Query H1BGrader.com public API for H-1B employer data.
   * This is a well-known public resource that indexes DOL/USCIS data.
   */
  private async queryH1bGraderApi(companyName: string): Promise<VisaCheckResult> {
    const normalized = this.normalizeCompanyName(companyName)
    const encodedName = encodeURIComponent(companyName)

    // H1BGrader has a public search endpoint
    const url = `https://h1bgrader.com/search/employer/${encodedName}`

    const res = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'Mozilla/5.0 (compatible; ExpatHunter/1.0; visa-sponsor-check)',
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      throw new Error(`H1BGrader returned ${res.status}`)
    }

    const html = await res.text()

    // Look for employer results in the HTML
    // The page contains employer names and petition counts
    const employerPattern = /<a[^>]*>([^<]*)<\/a>/gi
    const matches: Array<{ name: string; score: number }> = []
    let match: RegExpExecArray | null

    while ((match = employerPattern.exec(html)) !== null) {
      const foundName = match[1].trim()
      if (foundName.length < 3) continue
      const score = this.fuzzyMatch(normalized, this.normalizeCompanyName(foundName))
      if (score > 0.7) {
        matches.push({ name: foundName, score })
      }
    }

    // Also check for direct indicators of H-1B sponsorship in page content
    const hasApprovedPetitions =
      html.includes('Approved') || html.includes('Certified') || html.includes('petition')
    const lowerHtml = html.toLowerCase()
    const companyMentioned = lowerHtml.includes(normalized) || matches.length > 0

    if (companyMentioned && hasApprovedPetitions) {
      const bestMatch = matches.sort((a, b) => b.score - a.score)[0]
      return {
        isAccredited: true,
        countries: ['US'],
        visaTypes: ['H-1B'],
        matchedName: bestMatch?.name ?? companyName,
        confidence: bestMatch?.score ?? 0.75,
        source: 'h1bgrader.com',
      }
    }

    return {
      isAccredited: false,
      countries: [],
      visaTypes: [],
      confidence: 0,
      source: 'h1bgrader.com',
    }
  }

  /**
   * Check from local registry table (used for UK, AU, and as fallback).
   */
  private async checkFromRegistry(companyName: string, country: string): Promise<VisaCheckResult> {
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
  async refreshRegistry(country: 'NZ' | 'UK' | 'AU' | 'US'): Promise<number> {
    let records: VisaSponsorRecord[] = []

    try {
      if (country === 'NZ') records = await this.fetchNzRegistry()
      else if (country === 'UK') records = await this.fetchUkRegistry()
      else if (country === 'AU') records = await this.fetchAuRegistry()
      else if (country === 'US') records = await this.fetchUsRegistry()
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

  /**
   * Fetch NZ accredited employers by paginating through the Immigration NZ API.
   * The API returns up to ~20 results per page. We paginate with an empty query
   * to get all employers, or use a broad wildcard.
   */
  private async fetchNzRegistry(): Promise<VisaSponsorRecord[]> {
    const allRecords: VisaSponsorRecord[] = []
    const sourceUrl = SOURCE_URLS.NZ

    // The API requires at least 3 chars. Use common prefixes to scrape broadly.
    // Single-letter queries don't work, but 'a', 'b', etc. with 3+ chars won't cover all.
    // Strategy: iterate through alphabet trigrams to get broad coverage.
    const prefixes = 'abcdefghijklmnopqrstuvwxyz'.split('')
    const seenNames = new Set<string>()

    for (const prefix of prefixes) {
      try {
        // Query with single letter + padding — the API accepts 1-char queries when
        // submitted via the form, but may require 3. Try single letter first.
        let page = 1
        let totalPages = 1

        while (page <= totalPages) {
          const formData = new FormData()
          formData.append('query', prefix)
          formData.append('collection', '2')
          formData.append('page', String(page))

          const res = await fetch(NZ_API_URL, {
            method: 'POST',
            body: formData,
            headers: {
              Accept: 'application/json, text/plain, */*',
              Origin: 'https://www.immigration.govt.nz',
              Referer: sourceUrl,
            },
            signal: AbortSignal.timeout(20_000),
          })

          if (!res.ok) break

          const json = (await res.json()) as {
            results: string
            current: number
            totalPages: number
            totalResults: number
          }

          if (!json.results || json.totalResults === 0) break

          const results = JSON.parse(json.results) as Array<{
            field_schema: {
              raw: Array<{ APIColumn: string; Value: string }>
            }
            title: { raw: string }
          }>

          for (const result of results) {
            const employerName =
              result.field_schema.raw.find((f) => f.APIColumn === 'employerName')?.Value ?? ''
            const tradingName =
              result.field_schema.raw.find((f) => f.APIColumn === 'tradingName')?.Value ?? ''
            const expiryDate =
              result.field_schema.raw.find((f) => f.APIColumn === 'expiryDateOfAccreditation')
                ?.Value ?? ''
            const nzbn =
              result.field_schema.raw.find((f) => f.APIColumn === 'nzbn')?.Value ?? ''

            if (!employerName || seenNames.has(employerName.toUpperCase())) continue
            seenNames.add(employerName.toUpperCase())

            allRecords.push({
              companyName: employerName,
              companyNameNormalized: this.normalizeCompanyName(employerName),
              country: 'NZ',
              visaType: 'AEWV',
              expiresAt: expiryDate || undefined,
              rawData: { tradingName, nzbn, expiryDate },
              sourceUrl,
            })
          }

          totalPages = json.totalPages
          page++

          // Rate limiting: small delay between pages
          await new Promise((resolve) => setTimeout(resolve, 200))
        }
      } catch {
        // Continue with next prefix if one fails
        continue
      }

      // Rate limiting between prefixes
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    return allRecords
  }

  /**
   * Fetch US H-1B employer data from DOL LCA disclosure files.
   * The DOL publishes quarterly Excel files. We download and parse the latest.
   * This is a large file (~50MB+), so we handle it carefully.
   */
  private async fetchUsRegistry(): Promise<VisaSponsorRecord[]> {
    // Try multiple fiscal year URLs (most recent first)
    const urls = [
      'https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/LCA_Disclosure_Data_FY2025_Q4.xlsx',
      'https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/LCA_Disclosure_Data_FY2026_Q1.xlsx',
      'https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/LCA_Disclosure_Data_FY2025_Q3.xlsx',
    ]

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(120_000), // 2 min timeout for large file
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ExpatHunter/1.0; visa-data-refresh)',
          },
        })

        if (!res.ok) continue

        // The file is Excel format. We need to parse it.
        // Since we can't easily parse XLSX in Node without a library,
        // we'll extract unique employer names from the CSV version if available,
        // or process the Excel buffer.
        const buffer = await res.arrayBuffer()
        return this.parseUsLcaExcel(Buffer.from(buffer), url)
      } catch {
        continue
      }
    }

    return []
  }

  /**
   * Parse DOL LCA Excel file to extract unique H-1B sponsor employers.
   * The Excel file has columns including EMPLOYER_NAME and CASE_STATUS.
   * We only include employers with 'Certified' status.
   *
   * Since parsing XLSX without a library is complex, we use a simplified approach:
   * extract strings that look like employer names from the shared strings table.
   */
  private parseUsLcaExcel(buffer: Buffer, sourceUrl: string): VisaSponsorRecord[] {
    // XLSX files are ZIP archives. The shared strings are in xl/sharedStrings.xml.
    // For a production-grade solution, we'd use a library like 'xlsx' or 'exceljs'.
    // Here we do a best-effort extraction from the raw buffer.

    const text = buffer.toString('utf8', 0, Math.min(buffer.length, 50_000_000))

    // Look for employer names in the binary/XML content
    // DOL LCA files have EMPLOYER_NAME column with company names
    // We extract unique certified employer names
    const employerNames = new Set<string>()

    // Pattern: look for strings between XML tags that look like company names
    // In XLSX shared strings: <t>EMPLOYER NAME</t>
    const tagPattern = /<t[^>]*>([^<]+)<\/t>/g
    let tagMatch: RegExpExecArray | null

    // Track if we've seen "Certified" near an employer name
    const allStrings: string[] = []
    while ((tagMatch = tagPattern.exec(text)) !== null) {
      allStrings.push(tagMatch[1])
    }

    // The shared strings table lists all unique strings used in the spreadsheet.
    // Employer names are typically in ALL CAPS or Title Case, longer than 3 chars,
    // and not column headers or status values.
    const skipValues = new Set([
      'Certified',
      'Certified - Withdrawn',
      'Denied',
      'Withdrawn',
      'H-1B',
      'H-1B1 Chile',
      'H-1B1 Singapore',
      'E-3 Australian',
      'EMPLOYER_NAME',
      'CASE_STATUS',
      'VISA_CLASS',
    ])

    for (const str of allStrings) {
      if (str.length < 3 || str.length > 200) continue
      if (skipValues.has(str)) continue
      // Skip numeric strings, dates, URLs
      if (/^\d+$/.test(str)) continue
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) continue
      if (str.startsWith('http')) continue
      // Employer names are typically all uppercase in DOL data
      if (str === str.toUpperCase() && /[A-Z]{3,}/.test(str) && str.includes(' ')) {
        employerNames.add(str)
      }
    }

    const records: VisaSponsorRecord[] = []
    for (const name of employerNames) {
      if (records.length >= 50_000) break // Safety limit
      records.push({
        companyName: name,
        companyNameNormalized: this.normalizeCompanyName(name),
        country: 'US',
        visaType: 'H-1B',
        rawData: { source: 'DOL LCA Disclosure' },
        sourceUrl,
      })
    }

    return records
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
