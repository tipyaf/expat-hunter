import OpenRouterClient from '#ai/openrouter_client'
import {
  buildCvAdaptationPrompt,
  buildCvRefinementPrompt,
  parseCvAdaptationResponse,
  type CvReplacementItem,
} from '#ai/prompts/cv_adaptation_prompt'
import { deduceLanguage } from '#constants/language'
import CandidateProfile from '#models/candidate_profile'
import JobApplication from '#models/job_application'
import JobOffer from '#models/job_offer'
import UsageService from '#services/usage_service'
import logger from '@adonisjs/core/services/logger'
import type { UserPlan } from '@expat-hunter/shared'

const AI_TEMPERATURE = 0.3
const AI_MAX_TOKENS = 2048

export interface GenerateCvResult {
  application: JobApplication
  cvReplacements: CvReplacementItem[]
}

export default class JobCvGenerationService {
  private readonly aiClient: OpenRouterClient
  private readonly usageService: UsageService

  constructor(aiClient?: OpenRouterClient, usageService?: UsageService) {
    this.aiClient = aiClient ?? new OpenRouterClient()
    this.usageService = usageService ?? new UsageService()
  }

  async generateCv(offerId: string, userId: string, plan: UserPlan): Promise<GenerateCvResult> {
    const quotaCheck = await this.usageService.checkQuota(userId, plan, 'cvGenerations')
    if (!quotaCheck.allowed) {
      const error = new Error('CV generation quota exceeded. Free plan allows 1 CV per week.')
      ;(error as Error & { code: string }).code = 'QUOTA_EXCEEDED'
      ;(error as Error & { status: number }).status = 403
      throw error
    }

    const offer = await JobOffer.query()
      .where('id', offerId)
      .preload('companyCache')
      .firstOrFail()

    const profile = await CandidateProfile.query()
      .where('userId', userId)
      .first()

    if (!profile?.cvText) {
      const error = new Error('No CV found in your profile. Upload your CV first.')
      ;(error as Error & { code: string }).code = 'NO_CV'
      ;(error as Error & { status: number }).status = 400
      throw error
    }

    const language = deduceLanguage(profile.targetCountries)

    const application = await JobApplication.firstOrCreate(
      { offerId, userId },
      {
        offerId,
        userId,
        status: 'draft',
        language,
      }
    )

    if (!this.aiClient.isConfigured) {
      logger.warn({ offerId }, 'JobCvGenerationService: OpenRouter not configured')
      return { application, cvReplacements: [] }
    }

    const { system, user } = buildCvAdaptationPrompt({
      cvText: profile.cvText,
      offerTitle: offer.title,
      offerDescription: offer.descriptionRaw,
      companyName: offer.companyName ?? offer.companyCache?.name ?? null,
      companySector: offer.companyCache?.sector ?? null,
      applicationAdvice: offer.applicationAdvice,
      language,
    })

    try {
      const raw = await this.aiClient.chat({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: AI_TEMPERATURE,
        maxTokens: AI_MAX_TOKENS,
      })

      const result = parseCvAdaptationResponse(raw)
      const replacements = result?.replacements ?? []

      application.cvReplacements = replacements
      application.cvText = this.applyReplacements(profile.cvText, replacements)
      application.language = language
      await application.save()

      await this.usageService.increment(userId, 'cvGenerations')

      logger.info(
        { offerId, userId, replacementsCount: replacements.length },
        'JobCvGenerationService: CV generated'
      )

      return { application, cvReplacements: replacements }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error(
        { offerId, userId, error: message },
        'JobCvGenerationService: AI generation failed'
      )
      const serviceError = new Error('CV generation failed. Please try again later.')
      ;(serviceError as Error & { code: string }).code = 'AI_ERROR'
      ;(serviceError as Error & { status: number }).status = 503
      throw serviceError
    }
  }

  async refineCv(
    offerId: string,
    userId: string,
    instruction: string
  ): Promise<GenerateCvResult> {
    const application = await JobApplication.query()
      .where('offerId', offerId)
      .where('userId', userId)
      .firstOrFail()

    const offer = await JobOffer.query()
      .where('id', offerId)
      .preload('companyCache')
      .firstOrFail()

    const profile = await CandidateProfile.query()
      .where('userId', userId)
      .first()

    if (!profile?.cvText) {
      const error = new Error('No CV found in your profile. Upload your CV first.')
      ;(error as Error & { code: string }).code = 'NO_CV'
      ;(error as Error & { status: number }).status = 400
      throw error
    }

    if (!this.aiClient.isConfigured) {
      logger.warn({ offerId }, 'JobCvGenerationService: OpenRouter not configured for refinement')
      return { application, cvReplacements: application.cvReplacements ?? [] }
    }

    const { system, user } = buildCvRefinementPrompt({
      cvText: profile.cvText,
      offerTitle: offer.title,
      offerDescription: offer.descriptionRaw,
      companyName: offer.companyName ?? offer.companyCache?.name ?? null,
      companySector: offer.companyCache?.sector ?? null,
      applicationAdvice: offer.applicationAdvice,
      language: application.language,
      previousReplacements: application.cvReplacements ?? [],
      userInstruction: instruction,
    })

    try {
      const raw = await this.aiClient.chat({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: AI_TEMPERATURE,
        maxTokens: AI_MAX_TOKENS,
      })

      const result = parseCvAdaptationResponse(raw)
      const replacements = result?.replacements ?? []

      application.cvReplacements = replacements
      application.cvText = this.applyReplacements(profile.cvText, replacements)
      application.cvUserInstruction = instruction
      await application.save()

      logger.info(
        { offerId, userId, replacementsCount: replacements.length },
        'JobCvGenerationService: CV refined'
      )

      return { application, cvReplacements: replacements }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error(
        { offerId, userId, error: message },
        'JobCvGenerationService: AI refinement failed'
      )
      const serviceError = new Error('CV refinement failed. Please try again later.')
      ;(serviceError as Error & { code: string }).code = 'AI_ERROR'
      ;(serviceError as Error & { status: number }).status = 503
      throw serviceError
    }
  }

  async saveCvText(offerId: string, userId: string, cvText: string): Promise<JobApplication> {
    const application = await JobApplication.query()
      .where('offerId', offerId)
      .where('userId', userId)
      .firstOrFail()

    application.cvText = cvText
    await application.save()

    return application
  }

  async getApplication(offerId: string, userId: string): Promise<JobApplication | null> {
    return JobApplication.query()
      .where('offerId', offerId)
      .where('userId', userId)
      .first()
  }

  private applyReplacements(originalText: string, replacements: CvReplacementItem[]): string {
    let result = originalText
    for (const replacement of replacements) {
      result = result.replace(replacement.oldText, replacement.newText)
    }
    return result
  }
}
