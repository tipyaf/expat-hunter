import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import CvExtractor from '#ai/cv_extractor'
import type { CvExtractionResult } from '#ai/prompts/cv_extraction_prompt'
import type CandidateProfile from '#models/candidate_profile'
import type User from '#models/user'
import CvParserService from '#services/cv_parser_service'
import ProfileService from '#services/profile_service'
import { updateProfileValidator } from '#validators/profile_validator'

export default class ProfileController {
  private readonly profileService = new ProfileService()
  private cvParserService = new CvParserService()
  private readonly cvExtractor = new CvExtractor()

  async show({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const profile = await this.profileService.getProfile(user.id)

    if (!profile) {
      return response.ok({
        data: null,
        message: 'No profile found. Create one via PUT /api/profile.',
      })
    }

    return response.ok({ data: this.serializeProfile(profile, user.fullName) })
  }

  async update({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(updateProfileValidator)

    const profile = await this.profileService.updateProfile(user, data)

    return response.ok({ data: this.serializeProfile(profile, user.fullName) })
  }

  async uploadCv({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const cvFile = request.file('cv', {
      size: '5mb',
      extnames: ['pdf', 'txt'],
    })

    if (!cvFile) {
      return response.badRequest({
        error: { code: 'CV_REQUIRED', message: 'A CV file is required (pdf or txt, max 5MB)' },
      })
    }

    if (!cvFile.isValid) {
      return response.unprocessableEntity({
        error: {
          code: 'CV_INVALID',
          message: 'Invalid CV file',
          details: cvFile.errors,
        },
      })
    }

    const uploadsDir = app.tmpPath('uploads', 'cvs')
    await mkdir(uploadsDir, { recursive: true })

    const fileName = `${user.id}_${randomUUID()}.${cvFile.extname}`
    await cvFile.move(uploadsDir, { name: fileName })

    const filePath = join(uploadsDir, fileName)

    const parseResult = await this.parseCvText(filePath, response)
    if ('error' in parseResult) return parseResult.error

    const cvText = parseResult.text

    // Save raw text first
    let profile = await this.profileService.updateProfile(user, {
      cvFilePath: filePath,
      cvText,
    })

    // AI extraction (non-blocking: if it fails, we still have the raw text)
    const aiExtraction = await this.extractAiData(cvText, profile, user)
    if (aiExtraction) {
      profile = aiExtraction.updatedProfile ?? profile
    }

    return response.ok({
      data: this.serializeProfile(profile, user.fullName),
      aiExtraction: aiExtraction?.data ?? null,
      message: aiExtraction?.data
        ? 'CV uploaded, parsed and analyzed by AI'
        : 'CV uploaded and parsed successfully',
    })
  }

  private async parseCvText(
    filePath: string,
    response: HttpContext['response']
  ): Promise<{ text: string } | { error: ReturnType<HttpContext['response']['unprocessableEntity']> }> {
    try {
      const text = await this.cvParserService.extractText(filePath)
      return { text }
    } catch (error) {
      return {
        error: response.unprocessableEntity({
          error: {
            code: 'CV_PARSE_ERROR',
            message: error instanceof Error ? error.message : 'Impossible de lire le fichier CV',
          },
        }),
      }
    }
  }

  private async extractAiData(
    cvText: string,
    profile: CandidateProfile,
    user: User
  ): Promise<{ data: CvExtractionResult; updatedProfile?: CandidateProfile } | null> {
    try {
      const data = await this.cvExtractor.extract(cvText)
      if (!data) return null

      const updateData = this.buildAutoFillData(profile, data)
      let updatedProfile: CandidateProfile | undefined
      if (Object.keys(updateData).length > 0) {
        updatedProfile = await this.profileService.updateProfile(user, updateData)
      }

      return { data, updatedProfile }
    } catch {
      // AI extraction failure is not critical — raw text is already saved
      return null
    }
  }

  private buildAutoFillData(
    profile: CandidateProfile,
    extraction: CvExtractionResult
  ): Record<string, unknown> {
    const updateData: Record<string, unknown> = {}

    if (profile.skills.length === 0 && extraction.skills.length > 0) {
      updateData.skills = extraction.skills
    }
    if (profile.targetRoles.length === 0 && extraction.suggestedRoles.length > 0) {
      updateData.targetRoles = extraction.suggestedRoles
    }
    if (profile.targetSectors.length === 0 && extraction.suggestedSectors.length > 0) {
      updateData.targetSectors = extraction.suggestedSectors
    }
    if (profile.experienceYears === 0 && extraction.experienceYears) {
      updateData.experienceYears = extraction.experienceYears
    }

    return updateData
  }

  async completeOnboarding({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    try {
      const profile = await this.profileService.completeOnboarding(user)
      return response.ok({
        data: this.serializeProfile(profile, user.fullName),
        message: 'Onboarding completed successfully',
      })
    } catch (error) {
      if (error instanceof Error) {
        return response.unprocessableEntity({
          error: { code: 'ONBOARDING_INCOMPLETE', message: error.message },
        })
      }
      throw error
    }
  }

  private computeCompletionPercentage(profile: {
    cvText: string | null
    skills: string[]
    targetCountries: string[]
    targetRoles: string[]
  }, userFullName?: string): number {
    let pct = 0
    if (userFullName) pct += 20
    if (profile.cvText) pct += 20
    if (profile.skills.length > 0) pct += 20
    if (profile.targetCountries.length > 0) pct += 20
    if (profile.targetRoles.length > 0) pct += 20
    return pct
  }

  private serializeProfile(profile: {
    id: string
    userId: string
    cvText: string | null
    cvFilePath: string | null
    skills: string[]
    experienceYears: number
    targetCountries: string[]
    targetSectors: string[]
    targetRoles: string[]
    preferences: Record<string, unknown> | null
    followUps: Array<{ delay: number; unit: 'days' | 'weeks' | 'months' }> | null
    sendingSchedule: { allowedDays: string[]; startHour: number; endHour: number; timezone: string } | null
    onboardingCompleted: boolean
    createdAt: unknown
    updatedAt: unknown
  }, userFullName?: string) {
    return {
      id: profile.id,
      userId: profile.userId,
      cvText: profile.cvText,
      cvFilePath: profile.cvFilePath,
      skills: profile.skills,
      experienceYears: profile.experienceYears,
      targetCountries: profile.targetCountries,
      targetSectors: profile.targetSectors,
      targetRoles: profile.targetRoles,
      preferences: profile.preferences,
      followUps: profile.followUps,
      sendingSchedule: profile.sendingSchedule,
      onboardingCompleted: profile.onboardingCompleted,
      isOnboarded: profile.onboardingCompleted,
      completionPercentage: this.computeCompletionPercentage(profile, userFullName),
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    }
  }
}
