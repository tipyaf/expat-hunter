/**
 * VisaSponsorRegistryService — Facade that delegates to country-specific services.
 *
 * Public API is unchanged: checkCompany, checkNZ, checkUS, checkFromRegistry,
 * refreshRegistry, normalizeCompanyName, fuzzyMatch.
 *
 * Country logic lives in:
 *   - visa_nz_service.ts  (NZ Playwright scraping + registry fetch)
 *   - visa_us_service.ts  (US H1BGrader + DOL LCA parsing)
 *   - fuzzy_match_service.ts (normalization + fuzzy matching)
 *
 * Thresholds live in constants/scoring.ts.
 */

import VisaSponsorRegistry from '#models/visa_sponsor_registry'
import CacheService from './cache_service.js'
import PlaywrightClient from './playwright_client.js'
import FuzzyMatchService from './fuzzy_match_service.js'
import VisaNzService from './visa_nz_service.js'
import VisaUsService from './visa_us_service.js'
import { FUZZY_THRESHOLD_REGISTRY } from '../constants/scoring.js'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

export interface VisaCheckResult {
  status: 'accredited' | 'not_found' | 'unknown'
  isAccredited: boolean
  countries: string[]
  visaTypes: string[]
  matchedName?: string
  confidence: number // 0-1
  source?: string
  /** ISO date string — accreditation expiry from the government API (NZ only for now) */
  expiresAt?: string
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

const SOURCE_URLS: Record<string, string> = {
  NZ: 'https://www.immigration.govt.nz/work/requirements-for-work-visas/approved-employers/accredited-employer-list/',
  UK: 'https://assets.publishing.service.gov.uk/media/register-of-licensed-sponsors-workers.csv',
  US: 'https://www.dol.gov/agencies/eta/foreign-labor/performance',
  AU: 'https://immi.homeaffairs.gov.au/visas/working-in-australia/standard-business-sponsorship',
}

const BATCH_SIZE = 500

export default class VisaSponsorRegistryService {
  private cacheService = new CacheService()
  private playwrightClient = new PlaywrightClient()
  private fuzzyMatcher = new FuzzyMatchService()
  private nzService: VisaNzService
  private usService: VisaUsService

  constructor() {
    this.nzService = new VisaNzService(this.cacheService, this.playwrightClient, this.fuzzyMatcher)
    this.usService = new VisaUsService(
      this.cacheService,
      this.fuzzyMatcher,
      (companyName, country) => this.checkFromRegistry(companyName, country)
    )
  }

  /**
   * Check if a company is an accredited visa sponsor for a given country.
   * Uses on-demand API checks for NZ and US, with caching.
   * Falls back to local registry table for UK and other pre-loaded countries.
   */
  async checkCompany(companyName: string, country: string): Promise<VisaCheckResult> {
    if (country === 'NZ' || country === 'New Zealand') {
      return this.checkNZ(companyName)
    }
    if (country === 'US' || country === 'United States' || country === 'USA') {
      return this.checkUS(companyName)
    }
    return this.checkFromRegistry(companyName, country)
  }

  /** Delegate to NZ service */
  async checkNZ(companyName: string): Promise<VisaCheckResult> {
    return this.nzService.checkNZ(companyName)
  }

  /** Delegate to US service */
  async checkUS(companyName: string): Promise<VisaCheckResult> {
    return this.usService.checkUS(companyName)
  }

  /**
   * Check from local registry table (used for UK, AU, and as fallback).
   */
  async checkFromRegistry(companyName: string, country: string): Promise<VisaCheckResult> {
    const normalized = this.fuzzyMatcher.normalizeCompanyName(companyName)

    const records = await VisaSponsorRegistry.query().where('country', country)

    if (records.length === 0) {
      return {
        status: 'not_found',
        isAccredited: false,
        countries: [],
        visaTypes: [],
        confidence: 0,
      }
    }

    let bestMatch: VisaSponsorRegistry | null = null
    let bestScore = 0

    for (const record of records) {
      const score = this.fuzzyMatcher.fuzzyMatch(normalized, record.companyNameNormalized)
      if (score > bestScore) {
        bestScore = score
        bestMatch = record
      }
    }

    if (!bestMatch || bestScore < FUZZY_THRESHOLD_REGISTRY) {
      return {
        status: 'not_found',
        isAccredited: false,
        countries: [],
        visaTypes: [],
        confidence: bestScore,
      }
    }

    const allRecords = await VisaSponsorRegistry.query()
      .where('country', country)
      .where('companyNameNormalized', bestMatch.companyNameNormalized)

    const visaTypes = [...new Set(allRecords.map((r) => r.visaType))]
    const countries = [...new Set(allRecords.map((r) => r.country))]

    return {
      status: 'accredited',
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
      if (country === 'NZ') records = await this.nzService.fetchNzRegistry()
      else if (country === 'UK') records = await this.fetchUkRegistry()
      else if (country === 'AU') records = await this.fetchAuRegistry()
      else if (country === 'US') records = await this.usService.fetchUsRegistry()
    } catch (err) {
      throw new Error(
        `Failed to fetch ${country} registry: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
    }

    if (records.length === 0) return 0

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

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE) as Array<Record<string, unknown>>
      await VisaSponsorRegistry.createMany(batch)
    }

    return records.length
  }

  // ─── Delegated helpers (keep public API stable) ──────────────────────────────

  normalizeCompanyName(name: string): string {
    return this.fuzzyMatcher.normalizeCompanyName(name)
  }

  fuzzyMatch(a: string, b: string): number {
    return this.fuzzyMatcher.fuzzyMatch(a, b)
  }

  // ─── Private fetchers (UK/AU stay here — small, not worth their own file) ────

  private async fetchUkRegistry(): Promise<VisaSponsorRecord[]> {
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
    return []
  }

  private parseCsv(
    csv: string,
    country: string,
    visaType: string,
    sourceUrl: string
  ): VisaSponsorRecord[] {
    const lines = csv.split('\n').filter((l) => l.trim())
    if (lines.length < 2) return []

    const records: VisaSponsorRecord[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvLine(lines[i])
      const companyName = cols[0]?.trim()
      if (!companyName || companyName.length < 2) continue

      records.push({
        companyName,
        companyNameNormalized: this.fuzzyMatcher.normalizeCompanyName(companyName),
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
}
