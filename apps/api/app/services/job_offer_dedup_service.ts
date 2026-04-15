/**
 * JobOfferDedupService — Detects duplicate job offers using rules + AI.
 *
 * Two-phase approach:
 * 1. Rule-based pre-filter (~90%): normalized company+title+location comparison
 * 2. OpenRouter AI for ambiguous cases (~10%): different wording but same job
 *
 * Also detects republications via (platform, external_id) matching.
 */
import { DEDUP_RULES } from '@expat-hunter/shared'
import JobOffer from '#models/job_offer'
import JobOfferLink from '#models/job_offer_link'
import OpenRouterClient from '#ai/openrouter_client'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

const AI_TEMPERATURE = 0.1
const AI_MAX_TOKENS = 10

interface DedupResult {
  duplicates: number
  republished: number
  aiCalls: number
}

export default class JobOfferDedupService {
  private readonly openRouterClient: OpenRouterClient

  constructor(openRouterClient?: OpenRouterClient) {
    this.openRouterClient = openRouterClient ?? new OpenRouterClient()
  }

  /**
   * Run dedup on newly persisted offers against existing offers for the same search.
   */
  async dedup(searchId: string, newOffers: JobOffer[]): Promise<DedupResult> {
    const result: DedupResult = { duplicates: 0, republished: 0, aiCalls: 0 }

    if (newOffers.length === 0) {
      return result
    }

    // Load existing offers for this search (excluding the new batch)
    const newOfferIds = new Set(newOffers.map((o) => o.id))
    const existingOffers = await JobOffer.query()
      .where('searchId', searchId)
      .whereNotIn('id', [...newOfferIds])
      .preload('links')

    if (existingOffers.length === 0) {
      return result
    }

    // Phase 0: Republication detection via (platform, external_id)
    const republished = await this.detectRepublications(newOffers, existingOffers)
    result.republished = republished

    // Phase 1: Rule-based pre-filter
    const ambiguous: JobOffer[] = []

    for (const newOffer of newOffers) {
      if (newOffer.status === 'duplicate') continue

      const ruleMatch = this.findRuleBasedMatch(newOffer, existingOffers)
      if (ruleMatch) {
        newOffer.status = 'duplicate'
        await newOffer.save()
        result.duplicates++
      } else {
        ambiguous.push(newOffer)
      }
    }

    // Phase 2: AI dedup for ambiguous cases
    if (ambiguous.length > 0 && this.openRouterClient.isConfigured) {
      const aiResult = await this.aiDedup(ambiguous, existingOffers)
      result.duplicates += aiResult.duplicates
      result.aiCalls = aiResult.aiCalls
    }

    logger.info(
      { searchId, ...result },
      'JobOfferDedupService: dedup completed'
    )

    return result
  }

  /**
   * Detect republications: same (platform, externalId) already exists.
   * Updates existing offer with is_republished=true and appends to publication_dates.
   */
  private async detectRepublications(
    newOffers: JobOffer[],
    existingOffers: JobOffer[]
  ): Promise<number> {
    let count = 0

    // Build a lookup: platform+externalId → existing offer
    const existingLinkMap = new Map<string, { offer: JobOffer; link: JobOfferLink }>()
    for (const existing of existingOffers) {
      for (const link of existing.links) {
        if (link.externalId) {
          const key = `${link.platform}:${link.externalId}`
          existingLinkMap.set(key, { offer: existing, link })
        }
      }
    }

    // Check new offers' links against the lookup
    for (const newOffer of newOffers) {
      const newLinks = await JobOfferLink.query().where('offerId', newOffer.id)

      for (const newLink of newLinks) {
        if (!newLink.externalId) continue
        const key = `${newLink.platform}:${newLink.externalId}`
        const match = existingLinkMap.get(key)

        if (match) {
          // Mark existing offer as republished
          match.offer.isRepublished = true
          match.offer.publicationDates = [
            ...match.offer.publicationDates,
            DateTime.now().toISO(),
          ]
          await match.offer.save()

          // Mark new offer as duplicate
          newOffer.status = 'duplicate'
          await newOffer.save()
          count++
          break
        }
      }
    }

    return count
  }

  /**
   * Rule-based matching: normalized company + title + location.
   * Returns true if a match is found above the similarity threshold.
   */
  private findRuleBasedMatch(newOffer: JobOffer, existingOffers: JobOffer[]): boolean {
    const newTitle = this.normalize(newOffer.title)
    const newLocation = this.normalizeLocation(newOffer.location ?? '')

    // We need company name from the offer — get it from title context or description
    // Since JobOffer doesn't have a company field directly, we compare title+location
    for (const existing of existingOffers) {
      if (existing.status === 'duplicate') continue

      const existingTitle = this.normalize(existing.title)
      const existingLocation = this.normalizeLocation(existing.location ?? '')

      const titleSimilarity = this.diceCoefficient(newTitle, existingTitle)
      const locationSimilarity = this.diceCoefficient(newLocation, existingLocation)

      if (
        titleSimilarity >= DEDUP_RULES.SIMILARITY_THRESHOLD &&
        locationSimilarity >= DEDUP_RULES.SIMILARITY_THRESHOLD
      ) {
        return true
      }
    }

    return false
  }

  /**
   * AI dedup for ambiguous cases — asks OpenRouter to confirm/deny duplicate status.
   * Fail-open: if AI is unavailable, offers are kept as 'new'.
   */
  private async aiDedup(
    ambiguousOffers: JobOffer[],
    existingOffers: JobOffer[]
  ): Promise<{ duplicates: number; aiCalls: number }> {
    let duplicates = 0
    let aiCalls = 0

    const existingSummaries = existingOffers
      .filter((o) => o.status !== 'duplicate')
      .slice(0, 20)
      .map((o) => `- "${o.title}" in ${o.location ?? 'unknown'}`)
      .join('\n')

    for (const offer of ambiguousOffers) {
      if (offer.status === 'duplicate') continue

      try {
        const prompt = this.buildAiDedupPrompt(offer, existingSummaries)
        const response = await this.openRouterClient.chat({
          messages: [
            { role: 'system', content: 'You are a job offer deduplication assistant. Answer only "DUPLICATE" or "UNIQUE". No explanation.' },
            { role: 'user', content: prompt },
          ],
          temperature: AI_TEMPERATURE,
          maxTokens: AI_MAX_TOKENS,
        })
        aiCalls++

        if (response.trim().toUpperCase().includes('DUPLICATE')) {
          offer.status = 'duplicate'
          await offer.save()
          duplicates++
        }
      } catch (error) {
        // Fail open — keep as 'new'
        const message = error instanceof Error ? error.message : 'Unknown error'
        logger.warn(
          { offerId: offer.id, error: message },
          'JobOfferDedupService: AI dedup failed, keeping as new'
        )
      }
    }

    return { duplicates, aiCalls }
  }

  private buildAiDedupPrompt(offer: JobOffer, existingSummaries: string): string {
    return `Is this job offer a duplicate of any in the existing list?

New offer:
- Title: "${offer.title}"
- Location: ${offer.location ?? 'unknown'}

Existing offers:
${existingSummaries}

Answer DUPLICATE or UNIQUE.`
  }

  /**
   * Normalize a string for comparison: lowercase, trim, strip common suffixes.
   */
  normalize(input: string): string {
    let s = input.toLowerCase().trim()
    for (const suffix of DEDUP_RULES.COMPANY_SUFFIXES) {
      const pattern = new RegExp(String.raw`\s+` + suffix + String.raw`\.?$`, 'i')
      s = s.replace(pattern, '')
    }
    return s.trim()
  }

  /**
   * Normalize location string: lowercase, trim, expand common abbreviations.
   */
  normalizeLocation(input: string): string {
    let s = input.toLowerCase().trim()
    for (const [abbr, full] of DEDUP_RULES.LOCATION_NORMALIZATIONS) {
      s = s.replaceAll(new RegExp(String.raw`\b` + abbr + String.raw`\b`, 'gi'), full)
    }
    return s.trim()
  }

  /**
   * Dice coefficient (bigram similarity) between two strings.
   * Returns 0..1 where 1 = identical.
   */
  diceCoefficient(a: string, b: string): number {
    if (a === b) return 1
    if (a.length < 2 || b.length < 2) return 0

    const bigramsA = new Map<string, number>()
    for (let i = 0; i < a.length - 1; i++) {
      const bigram = a.substring(i, i + 2)
      bigramsA.set(bigram, (bigramsA.get(bigram) ?? 0) + 1)
    }

    let intersections = 0
    for (let i = 0; i < b.length - 1; i++) {
      const bigram = b.substring(i, i + 2)
      const count = bigramsA.get(bigram) ?? 0
      if (count > 0) {
        bigramsA.set(bigram, count - 1)
        intersections++
      }
    }

    return (2 * intersections) / (a.length - 1 + b.length - 1)
  }
}
