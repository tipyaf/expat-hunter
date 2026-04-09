import OpenRouterClient from '#ai/openrouter_client'
import {
  buildCoverLetterPrompt,
  buildCoverLetterRefinementPrompt,
  parseCoverLetterResponse,
} from '#ai/prompts/cover_letter_prompt'
import CandidateProfile from '#models/candidate_profile'
import JobApplication from '#models/job_application'
import JobOffer from '#models/job_offer'
import UsageService from '#services/usage_service'
import logger from '@adonisjs/core/services/logger'
import type { CompanyType, UserPlan } from '@expat-hunter/shared'

/** Map country codes to cover letter language */
const COUNTRY_LANGUAGE_MAP: Record<string, string> = {
  FR: 'fr',
  CA: 'en',
  CH: 'fr',
  BE: 'fr',
  AU: 'en',
  NZ: 'en',
  GB: 'en',
  SG: 'en',
  AE: 'en',
  DE: 'en',
  NL: 'en',
  JP: 'en',
}

const DEFAULT_LANGUAGE = 'en'
const RECRUITMENT_AGENCY_TYPE: CompanyType = 'recruitment_agency'
const AI_TEMPERATURE = 0.3
const AI_MAX_TOKENS = 4096

export interface GenerateCoverLetterResult {
  application: JobApplication
  coverLetterText: string
}

export default class JobCoverLetterService {
  private readonly aiClient: OpenRouterClient
  private readonly usageService: UsageService

  constructor(aiClient?: OpenRouterClient, usageService?: UsageService) {
    this.aiClient = aiClient ?? new OpenRouterClient()
    this.usageService = usageService ?? new UsageService()
  }

  async generateCoverLetter(
    offerId: string,
    userId: string,
    plan: UserPlan
  ): Promise<GenerateCoverLetterResult> {
    const quotaCheck = await this.usageService.checkQuota(userId, plan, 'coverLetterGenerations')
    if (!quotaCheck.allowed) {
      const error = new Error('Cover letter generation quota exceeded. Free plan allows 1 cover letter per week.')
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

    const language = this.deduceLanguage(profile.targetCountries)
    const isAgency = offer.companyCache?.companyType === RECRUITMENT_AGENCY_TYPE

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
      logger.warn({ offerId }, 'JobCoverLetterService: OpenRouter not configured')
      return { application, coverLetterText: '' }
    }

    const { system, user } = buildCoverLetterPrompt({
      cvText: profile.cvText,
      offerTitle: offer.title,
      offerDescription: offer.descriptionRaw,
      companyName: offer.companyName ?? offer.companyCache?.name ?? null,
      companySector: isAgency ? null : (offer.companyCache?.sector ?? null),
      companySize: isAgency ? null : (offer.companyCache?.size ?? null),
      companyType: offer.companyCache?.companyType ?? null,
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

      const coverLetterText = parseCoverLetterResponse(raw) ?? ''

      application.coverLetterText = coverLetterText
      application.language = language
      await application.save()

      await this.usageService.increment(userId, 'coverLetterGenerations')

      logger.info(
        { offerId, userId, textLength: coverLetterText.length },
        'JobCoverLetterService: Cover letter generated'
      )

      return { application, coverLetterText }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error(
        { offerId, userId, error: message },
        'JobCoverLetterService: AI generation failed'
      )
      const serviceError = new Error('Cover letter generation failed. Please try again later.')
      ;(serviceError as Error & { code: string }).code = 'AI_ERROR'
      ;(serviceError as Error & { status: number }).status = 503
      throw serviceError
    }
  }

  async refineCoverLetter(
    offerId: string,
    userId: string,
    instruction: string
  ): Promise<GenerateCoverLetterResult> {
    const application = await JobApplication.query()
      .where('offerId', offerId)
      .where('userId', userId)
      .firstOrFail()

    if (!application.coverLetterText) {
      const error = new Error('No cover letter found. Generate a cover letter first.')
      ;(error as Error & { code: string }).code = 'NO_COVER_LETTER'
      ;(error as Error & { status: number }).status = 400
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

    if (!this.aiClient.isConfigured) {
      logger.warn({ offerId }, 'JobCoverLetterService: OpenRouter not configured for refinement')
      return { application, coverLetterText: application.coverLetterText }
    }

    const isAgency = offer.companyCache?.companyType === RECRUITMENT_AGENCY_TYPE

    const { system, user } = buildCoverLetterRefinementPrompt({
      cvText: profile.cvText,
      offerTitle: offer.title,
      offerDescription: offer.descriptionRaw,
      companyName: offer.companyName ?? offer.companyCache?.name ?? null,
      companySector: isAgency ? null : (offer.companyCache?.sector ?? null),
      companySize: isAgency ? null : (offer.companyCache?.size ?? null),
      companyType: offer.companyCache?.companyType ?? null,
      applicationAdvice: offer.applicationAdvice,
      language: application.language,
      previousCoverLetter: application.coverLetterText,
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

      const coverLetterText = parseCoverLetterResponse(raw) ?? application.coverLetterText

      application.coverLetterText = coverLetterText
      application.coverLetterUserInstruction = instruction
      await application.save()

      logger.info(
        { offerId, userId, textLength: coverLetterText.length },
        'JobCoverLetterService: Cover letter refined'
      )

      return { application, coverLetterText }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error(
        { offerId, userId, error: message },
        'JobCoverLetterService: AI refinement failed'
      )
      const serviceError = new Error('Cover letter refinement failed. Please try again later.')
      ;(serviceError as Error & { code: string }).code = 'AI_ERROR'
      ;(serviceError as Error & { status: number }).status = 503
      throw serviceError
    }
  }

  async saveCoverLetterText(
    offerId: string,
    userId: string,
    coverLetterText: string
  ): Promise<JobApplication> {
    const application = await JobApplication.query()
      .where('offerId', offerId)
      .where('userId', userId)
      .firstOrFail()

    application.coverLetterText = coverLetterText
    await application.save()

    return application
  }

  async getCoverLetterApplication(
    offerId: string,
    userId: string
  ): Promise<JobApplication | null> {
    return JobApplication.query()
      .where('offerId', offerId)
      .where('userId', userId)
      .first()
  }

  deduceLanguage(targetCountries: string[]): string {
    if (!targetCountries || targetCountries.length === 0) {
      return DEFAULT_LANGUAGE
    }
    return COUNTRY_LANGUAGE_MAP[targetCountries[0]] ?? DEFAULT_LANGUAGE
  }
}
