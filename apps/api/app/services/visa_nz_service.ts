/**
 * VisaNzService — NZ-specific visa sponsor checks via Playwright scraping.
 *
 * Extracted from VisaSponsorRegistryService. Handles:
 * - Scraping immigration.govt.nz accredited employer list
 * - Parsing the /list-api/getAPIResults/ response
 * - Fetching the full NZ registry for bulk import
 */

import type { VisaCheckResult, VisaSponsorRecord } from './visa_sponsor_registry.js'
import CacheService from './cache_service.js'
import PlaywrightClient from './playwright_client.js'
import FuzzyMatchService from './fuzzy_match_service.js'
import { FUZZY_THRESHOLD_NZ_API } from '../constants/scoring.js'
import { DateTime } from 'luxon'

// ─── NZ constants ──────────────────────────────────────────────────────────────

const NZ_PAGE_URL =
  'https://www.immigration.govt.nz/work/requirements-for-work-visas/approved-employers/accredited-employer-list/'
const NZ_SEARCH_INPUT_SELECTOR = '#search-filter-input-keyword'
const NZ_SEARCH_BUTTON_SELECTOR =
  'div.list-search__actions > button.btn.list-search__action.list-search__action--search'
const NZ_API_NETWORK_PATTERN = '**/list-api/getAPIResults/'
const NZ_WAIT_AFTER_CLICK_MS = 3_000
/** Fallback cache TTL for NZ visa checks when no expiry date is available */
const NZ_CACHE_TTL_DAYS = 30

export const NZ_SOURCE_URL =
  'https://www.immigration.govt.nz/work/requirements-for-work-visas/approved-employers/accredited-employer-list/'

// ─── Helper ────────────────────────────────────────────────────────────────────

/**
 * Compute the cache TTL for a NZ visa check result.
 * If the result contains a valid future expiry date, use it as the TTL.
 * Falls back to NZ_CACHE_TTL_DAYS (30 days) for unknown/not_found or missing expiry.
 */
export function computeNzCacheTtl(expiresAt: string | undefined): number {
  if (!expiresAt) return NZ_CACHE_TTL_DAYS
  const expiry = DateTime.fromISO(expiresAt)
  if (!expiry.isValid) return NZ_CACHE_TTL_DAYS
  const daysUntil = expiry.diff(DateTime.now(), 'days').days
  return Math.max(1, Math.ceil(daysUntil))
}

// ─── Service ───────────────────────────────────────────────────────────────────

export default class VisaNzService {
  private cacheService: CacheService
  private playwrightClient: PlaywrightClient
  private fuzzyMatcher: FuzzyMatchService
  /** Delay after clicking the search button, in ms. Override in tests to speed them up. */
  private nzWaitAfterClickMs = NZ_WAIT_AFTER_CLICK_MS

  constructor(
    cacheService: CacheService,
    playwrightClient: PlaywrightClient,
    fuzzyMatcher: FuzzyMatchService
  ) {
    this.cacheService = cacheService
    this.playwrightClient = playwrightClient
    this.fuzzyMatcher = fuzzyMatcher
  }

  /**
   * Check NZ accredited employer status via Playwright scraping.
   * Navigates to immigration.govt.nz, fills the search form, intercepts
   * the /list-api/getAPIResults/ network response, and parses the results.
   * Results are cached with a dynamic TTL. Returns 'unknown' on any error.
   */
  async checkNZ(companyName: string): Promise<VisaCheckResult> {
    const cacheKey = `nz:${this.fuzzyMatcher.normalizeCompanyName(companyName)}`
    const unknownResult: VisaCheckResult = {
      status: 'unknown',
      isAccredited: false,
      countries: [],
      visaTypes: [],
      confidence: 0,
      source: 'immigration.govt.nz',
    }

    try {
      const { data } = await this.cacheService.getOrFetch(
        'immigration-nz',
        'visa',
        cacheKey,
        async () => (await this.scrapeNzPage(companyName)) as unknown as Record<string, unknown>,
        (raw) => computeNzCacheTtl((raw as unknown as VisaCheckResult).expiresAt)
      )

      return data as unknown as VisaCheckResult
    } catch {
      return unknownResult
    }
  }

  /**
   * Scrape the NZ Immigration accredited employer list using the external Playwright server.
   * Flow: navigate -> wait for input -> fill -> verify fill -> click search -> wait -> get network response
   */
  async scrapeNzPage(companyName: string): Promise<VisaCheckResult> {
    const normalized = this.fuzzyMatcher.normalizeCompanyName(companyName)
    const unknownResult: VisaCheckResult = {
      status: 'unknown',
      isAccredited: false,
      countries: [],
      visaTypes: [],
      confidence: 0,
      source: 'immigration.govt.nz',
    }

    let sessionId: string | undefined

    try {
      ;({ sessionId } = await this.playwrightClient.navigate(NZ_PAGE_URL))
      if (!sessionId) return unknownResult

      await this.playwrightClient.waitForSelector(NZ_SEARCH_INPUT_SELECTOR, sessionId)

      const filledValue = await this.playwrightClient.fillReactInput(
        NZ_SEARCH_INPUT_SELECTOR,
        companyName,
        sessionId
      )

      if (!filledValue) {
        await this.playwrightClient.fill(NZ_SEARCH_INPUT_SELECTOR, companyName, sessionId)
      }

      await this.playwrightClient.click(NZ_SEARCH_BUTTON_SELECTOR, sessionId)
      await new Promise((resolve) => setTimeout(resolve, this.nzWaitAfterClickMs))

      const networkResult = await this.playwrightClient.getNetworkRequests(
        NZ_API_NETWORK_PATTERN,
        sessionId
      )

      const request = networkResult.requests?.[0]
      if (!request?.body) return { ...unknownResult, status: 'not_found' }

      return this.parseNzApiResponse(request.body, request.statusCode, normalized)
    } finally {
      if (sessionId) await this.playwrightClient.close(sessionId)
    }
  }

  /**
   * Parse the intercepted /list-api/getAPIResults/ response body.
   * The body is a JSON string, and inside it "results" is also a JSON string.
   */
  parseNzApiResponse(
    rawBody: string,
    statusCode: number,
    normalizedQuery: string
  ): VisaCheckResult {
    const notFoundResult: VisaCheckResult = {
      status: 'not_found',
      isAccredited: false,
      countries: [],
      visaTypes: [],
      confidence: 0,
      source: 'immigration.govt.nz',
    }

    let parsed: {
      results?: string | unknown[]
      totalResults?: number
      Message?: string
      Title?: string
    }

    try {
      parsed = JSON.parse(rawBody)
    } catch {
      return notFoundResult
    }

    if (statusCode !== 200 || !parsed.results) {
      return notFoundResult
    }

    const results = (
      typeof parsed.results === 'string' ? JSON.parse(parsed.results) : parsed.results
    ) as Array<{
      field_schema: { raw: Array<{ APIColumn: string; Value: string }> }
      title?: { raw: string }
      id?: { raw: number }
    }>

    if (!results || results.length === 0) return notFoundResult

    let bestMatch: (typeof results)[0] | null = null
    let bestScore = 0

    for (const result of results) {
      const employerName =
        result.field_schema.raw.find((f) => f.APIColumn === 'employerName')?.Value ?? ''
      const tradingName =
        result.field_schema.raw.find((f) => f.APIColumn === 'tradingName')?.Value ?? ''

      const scoreEmployer = this.fuzzyMatcher.fuzzyMatch(
        normalizedQuery,
        this.fuzzyMatcher.normalizeCompanyName(employerName)
      )
      const scoreTrading = this.fuzzyMatcher.fuzzyMatch(
        normalizedQuery,
        this.fuzzyMatcher.normalizeCompanyName(tradingName)
      )
      const score = Math.max(scoreEmployer, scoreTrading)

      if (score > bestScore) {
        bestScore = score
        bestMatch = result
      }
    }

    if (!bestMatch || bestScore < FUZZY_THRESHOLD_NZ_API) {
      return { ...notFoundResult, confidence: bestScore }
    }

    const matchedName =
      bestMatch.field_schema.raw.find((f) => f.APIColumn === 'employerName')?.Value ?? ''
    const expiryDate =
      bestMatch.field_schema.raw.find((f) => f.APIColumn === 'expiryDateOfAccreditation')?.Value ??
      ''

    if (expiryDate) {
      const expiry = DateTime.fromISO(expiryDate)
      if (expiry.isValid && expiry < DateTime.now()) {
        return {
          status: 'not_found',
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
      status: 'accredited',
      isAccredited: true,
      countries: ['NZ'],
      visaTypes: ['AEWV'],
      matchedName,
      confidence: bestScore,
      source: 'immigration.govt.nz',
      expiresAt: expiryDate || undefined,
    }
  }

  /**
   * Fetch NZ accredited employers by paginating through the Immigration NZ API.
   */
  async fetchNzRegistry(): Promise<VisaSponsorRecord[]> {
    const allRecords: VisaSponsorRecord[] = []
    const sourceUrl = NZ_SOURCE_URL

    const prefixes = 'abcdefghijklmnopqrstuvwxyz'.split('')
    const seenNames = new Set<string>()

    for (const prefix of prefixes) {
      try {
        let page = 1
        let totalPages = 1

        while (page <= totalPages) {
          const formData = new FormData()
          formData.append('query', prefix)
          formData.append('collection', '2')
          formData.append('page', String(page))

          const res = await fetch('https://www.immigration.govt.nz/list-api/getAPIResults/', {
            method: 'POST',
            body: formData,
            headers: {
              Accept: 'application/json, text/plain, */*',
              Origin: 'https://www.immigration.govt.nz',
              Referer: sourceUrl,
            },
            signal: AbortSignal.timeout(20_000),
          })

          if (res.status === 400) break
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
              companyNameNormalized: this.fuzzyMatcher.normalizeCompanyName(employerName),
              country: 'NZ',
              visaType: 'AEWV',
              expiresAt: expiryDate || undefined,
              rawData: { tradingName, nzbn, expiryDate },
              sourceUrl,
            })
          }

          totalPages = json.totalPages
          page++

          await new Promise((resolve) => setTimeout(resolve, 200))
        }
      } catch {
        continue
      }

      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    return allRecords
  }
}
