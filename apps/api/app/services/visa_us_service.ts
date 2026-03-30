/**
 * VisaUsService — US-specific visa sponsor checks (H-1B).
 *
 * Extracted from VisaSponsorRegistryService. Handles:
 * - Querying H1BGrader API for on-demand H-1B sponsor lookups
 * - Parsing DOL LCA Excel disclosure data for bulk registry import
 */

import type { VisaCheckResult, VisaSponsorRecord } from './visa_sponsor_registry.js'
import CacheService from './cache_service.js'
import FuzzyMatchService from './fuzzy_match_service.js'
import {
  FUZZY_THRESHOLD_NZ_API,
  FUZZY_THRESHOLD_US_DEFAULT_CONFIDENCE,
} from '../constants/scoring.js'

const US_CACHE_TTL_DAYS = 90

export default class VisaUsService {
  private cacheService: CacheService
  private fuzzyMatcher: FuzzyMatchService
  /** Injected callback to fall back to the local registry table */
  private checkFromRegistry: (companyName: string, country: string) => Promise<VisaCheckResult>

  constructor(
    cacheService: CacheService,
    fuzzyMatcher: FuzzyMatchService,
    checkFromRegistry: (companyName: string, country: string) => Promise<VisaCheckResult>
  ) {
    this.cacheService = cacheService
    this.fuzzyMatcher = fuzzyMatcher
    this.checkFromRegistry = checkFromRegistry
  }

  /**
   * Check US H-1B visa sponsor status.
   * Uses a two-tier approach: local registry first, then H1BGrader API.
   * Results are cached for 90 days.
   */
  async checkUS(companyName: string): Promise<VisaCheckResult> {
    const cacheKey = `us:${this.fuzzyMatcher.normalizeCompanyName(companyName)}`
    const unknownResult: VisaCheckResult = {
      status: 'unknown',
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
        US_CACHE_TTL_DAYS
      )

      return data as unknown as VisaCheckResult
    } catch {
      const registryResult = await this.checkFromRegistry(companyName, 'US').catch(() => null)
      if (registryResult?.isAccredited) return registryResult
      return unknownResult
    }
  }

  /**
   * Query US H-1B sponsor data.
   * First checks the local registry, then tries the public H1BGrader API.
   */
  private async queryUsH1b(companyName: string): Promise<VisaCheckResult> {
    const registryResult = await this.checkFromRegistry(companyName, 'US').catch(() => null)
    if (registryResult && registryResult.isAccredited) {
      return { ...registryResult, source: 'dol.gov/lca' }
    }

    try {
      return await this.queryH1bGraderApi(companyName)
    } catch {
      return {
        status: 'unknown',
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
   */
  private async queryH1bGraderApi(companyName: string): Promise<VisaCheckResult> {
    const normalized = this.fuzzyMatcher.normalizeCompanyName(companyName)
    const encodedName = encodeURIComponent(companyName)

    const url = `https://h1bgrader.com/search/employer/${encodedName}`

    const res = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; ExpatHunter/1.0; visa-sponsor-check)',
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      throw new Error(`H1BGrader returned ${res.status}`)
    }

    const html = await res.text()

    const employerPattern = /<a[^>]*>([^<]*)<\/a>/gi
    const matches: Array<{ name: string; score: number }> = []
    let match: RegExpExecArray | null

    while ((match = employerPattern.exec(html)) !== null) {
      const foundName = match[1].trim()
      if (foundName.length < 3) continue
      const score = this.fuzzyMatcher.fuzzyMatch(
        normalized,
        this.fuzzyMatcher.normalizeCompanyName(foundName)
      )
      if (score > FUZZY_THRESHOLD_NZ_API) {
        matches.push({ name: foundName, score })
      }
    }

    const hasApprovedPetitions =
      html.includes('Approved') || html.includes('Certified') || html.includes('petition')
    const lowerHtml = html.toLowerCase()
    const companyMentioned = lowerHtml.includes(normalized) || matches.length > 0

    if (companyMentioned && hasApprovedPetitions) {
      const bestMatch = matches.sort((a, b) => b.score - a.score)[0]
      return {
        status: 'accredited',
        isAccredited: true,
        countries: ['US'],
        visaTypes: ['H-1B'],
        matchedName: bestMatch?.name ?? companyName,
        confidence: bestMatch?.score ?? FUZZY_THRESHOLD_US_DEFAULT_CONFIDENCE,
        source: 'h1bgrader.com',
      }
    }

    return {
      status: 'not_found',
      isAccredited: false,
      countries: [],
      visaTypes: [],
      confidence: 0,
      source: 'h1bgrader.com',
    }
  }

  /**
   * Fetch US H-1B employer data from DOL LCA disclosure files.
   * Downloads quarterly Excel files and extracts unique employer names.
   */
  async fetchUsRegistry(): Promise<VisaSponsorRecord[]> {
    const urls = [
      'https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/LCA_Disclosure_Data_FY2025_Q4.xlsx',
      'https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/LCA_Disclosure_Data_FY2026_Q1.xlsx',
      'https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/LCA_Disclosure_Data_FY2025_Q3.xlsx',
    ]

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(120_000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ExpatHunter/1.0; visa-data-refresh)',
          },
        })

        if (!res.ok) continue

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
   * Uses a simplified approach: extracts strings from the shared strings table.
   */
  parseUsLcaExcel(buffer: Buffer, sourceUrl: string): VisaSponsorRecord[] {
    const text = buffer.toString('utf8', 0, Math.min(buffer.length, 50_000_000))

    const employerNames = new Set<string>()

    const tagPattern = /<t[^>]*>([^<]+)<\/t>/g
    let tagMatch: RegExpExecArray | null

    const allStrings: string[] = []
    while ((tagMatch = tagPattern.exec(text)) !== null) {
      allStrings.push(tagMatch[1])
    }

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
      if (/^\d+$/.test(str)) continue
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) continue
      if (str.startsWith('http')) continue
      if (str === str.toUpperCase() && /[A-Z]{3,}/.test(str) && str.includes(' ')) {
        employerNames.add(str)
      }
    }

    const records: VisaSponsorRecord[] = []
    const SAFETY_LIMIT = 50_000
    for (const name of employerNames) {
      if (records.length >= SAFETY_LIMIT) break
      records.push({
        companyName: name,
        companyNameNormalized: this.fuzzyMatcher.normalizeCompanyName(name),
        country: 'US',
        visaType: 'H-1B',
        rawData: { source: 'DOL LCA Disclosure' },
        sourceUrl,
      })
    }

    return records
  }
}
