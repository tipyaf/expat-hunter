/**
 * JobAiEvaluationService — Evaluate job offers via OpenRouter AI.
 *
 * Batch-processes unevaluated offers for a search, builds prompts from
 * candidate profile + offer + exclusion history, parses structured responses.
 * Fail-open: on error, offers stay status='new' (never fail closed).
 */
import { EVALUATION_BATCH_SIZE } from '@expat-hunter/shared'
import OpenRouterClient from '#ai/openrouter_client'
import {
  buildJobEvaluationPrompt,
  parseJobEvaluationResponse,
  type CandidateForEvaluation,
  type ExclusionForPrompt,
  type JobOfferForEvaluation,
} from '#ai/prompts/job_evaluation_prompt'
import CandidateProfile from '#models/candidate_profile'
import JobOffer from '#models/job_offer'
import JobOfferExclusion from '#models/job_offer_exclusion'
import JobSearch from '#models/job_search'
import User from '#models/user'
import logger from '@adonisjs/core/services/logger'

const BATCH_DELAY_MS = 1000
const AI_TEMPERATURE = 0.2
const AI_MAX_TOKENS = 512

interface EvaluationResult {
  evaluated: number
  skipped: number
  errors: number
}

export default class JobAiEvaluationService {
  private readonly client: OpenRouterClient

  constructor(client?: OpenRouterClient) {
    this.client = client ?? new OpenRouterClient()
  }

  /**
   * Evaluate all unevaluated offers for a search. Processes in batches of
   * EVALUATION_BATCH_SIZE with rate limiting between batches.
   */
  async evaluateForSearch(searchId: string, userId: string): Promise<EvaluationResult> {
    const result: EvaluationResult = { evaluated: 0, skipped: 0, errors: 0 }

    if (!this.client.isConfigured) {
      logger.warn({ searchId }, 'JobAiEvaluationService: OpenRouter not configured, skipping evaluation')
      return result
    }

    // Verify ownership
    await JobSearch.query()
      .where('id', searchId)
      .where('userId', userId)
      .firstOrFail()

    // Load user locale
    const user = await User.find(userId)
    const locale = user?.locale

    // Load candidate profile
    const profile = await CandidateProfile.query().where('userId', userId).first()
    const candidateContext = this.buildCandidateContext(profile)

    // Load exclusion history for learning
    const exclusions = await JobOfferExclusion.query()
      .where('userId', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
    const exclusionContext = exclusions.map((e) => ({
      category: e.category,
      reason: e.reason,
    }))

    // Get unevaluated offers (relevanceScore is null, status is 'new')
    const offers = await JobOffer.query()
      .where('searchId', searchId)
      .whereNull('relevanceScore')
      .where('status', 'new')
      .orderBy('createdAt', 'asc')

    if (offers.length === 0) {
      return result
    }

    // Process in batches
    for (let i = 0; i < offers.length; i += EVALUATION_BATCH_SIZE) {
      const batch = offers.slice(i, i + EVALUATION_BATCH_SIZE)

      for (const offer of batch) {
        await this.evaluateOffer(offer, candidateContext, exclusionContext, result, locale)
      }

      // Rate limit between batches (skip delay after last batch)
      if (i + EVALUATION_BATCH_SIZE < offers.length) {
        await this.delay(BATCH_DELAY_MS)
      }
    }

    logger.info(
      { searchId, ...result },
      'JobAiEvaluationService: evaluation completed'
    )

    return result
  }

  /**
   * Evaluate a single offer and update its record. Fail-open on error.
   */
  private async evaluateOffer(
    offer: JobOffer,
    candidateContext: CandidateForEvaluation,
    exclusionContext: ExclusionForPrompt[],
    result: EvaluationResult,
    locale?: string
  ): Promise<void> {
    try {
      const evalResult = await this.evaluate(
        this.buildOfferContext(offer),
        candidateContext,
        exclusionContext,
        locale
      )

      if (evalResult) {
        offer.relevanceScore = evalResult.relevanceScore
        offer.matchSummary = evalResult.matchSummary
        offer.selectionReason = evalResult.selectionReason
        offer.applicationAdvice = evalResult.applicationAdvice
        offer.status = 'evaluated'
        await offer.save()
        result.evaluated++
      } else {
        // Parse failed — fail open, keep as 'new'
        result.errors++
        logger.warn(
          { offerId: offer.id },
          'JobAiEvaluationService: parse failed, keeping offer as new'
        )
      }
    } catch (error) {
      // Fail open — offer stays 'new'
      result.errors++
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error(
        { offerId: offer.id, error: message },
        'JobAiEvaluationService: evaluation failed, keeping offer as new'
      )
    }
  }

  /**
   * Evaluate a single offer against a profile and exclusion context.
   */
  async evaluate(
    offer: JobOfferForEvaluation,
    profile: CandidateForEvaluation,
    exclusions: ExclusionForPrompt[],
    locale?: string
  ): Promise<ReturnType<typeof parseJobEvaluationResponse>> {
    const { system, user } = buildJobEvaluationPrompt(offer, profile, exclusions, locale)

    const raw = await this.client.chat({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: AI_TEMPERATURE,
      maxTokens: AI_MAX_TOKENS,
    })

    return parseJobEvaluationResponse(raw)
  }

  private buildCandidateContext(profile: CandidateProfile | null): CandidateForEvaluation {
    if (!profile) {
      return {
        skills: [],
        experienceYears: 0,
        targetCountries: [],
        targetSectors: [],
        targetRoles: [],
        cvSummary: null,
      }
    }

    return {
      skills: profile.skills,
      experienceYears: profile.experienceYears,
      targetCountries: profile.targetCountries,
      targetSectors: profile.targetSectors,
      targetRoles: profile.targetRoles,
      cvSummary: profile.cvText,
    }
  }

  private buildOfferContext(offer: JobOffer): JobOfferForEvaluation {
    return {
      title: offer.title,
      descriptionRaw: offer.descriptionRaw,
      location: offer.location,
      salaryMin: offer.salaryMin,
      salaryMax: offer.salaryMax,
      salaryCurrency: offer.salaryCurrency,
      remoteType: offer.remoteType,
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
