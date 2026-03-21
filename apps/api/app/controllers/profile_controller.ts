import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import CvExtractor from '#ai/cv_extractor'
import CvParserService from '#services/cv_parser_service'
import ProfileService from '#services/profile_service'
import { updateProfileValidator } from '#validators/profile_validator'

export default class ProfileController {
  private profileService = new ProfileService()
  private cvParserService = new CvParserService()
  private cvExtractor = new CvExtractor()

  async show({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const profile = await this.profileService.getProfile(user.id)

    if (!profile) {
      return response.ok({
        data: null,
        message: 'No profile found. Create one via PUT /api/profile.',
      })
    }

    return response.ok({ data: this.serializeProfile(profile) })
  }

  async update({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(updateProfileValidator)

    const profile = await this.profileService.updateProfile(user, data)

    return response.ok({ data: this.serializeProfile(profile) })
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

    let cvText: string
    try {
      cvText = await this.cvParserService.extractText(filePath)
    } catch (error) {
      return response.unprocessableEntity({
        error: {
          code: 'CV_PARSE_ERROR',
          message: error instanceof Error ? error.message : 'Impossible de lire le fichier CV',
        },
      })
    }

    // Save raw text first
    let profile = await this.profileService.updateProfile(user, {
      cvFilePath: filePath,
      cvText,
    })

    // AI extraction (non-blocking: if it fails, we still have the raw text)
    let aiExtraction = null
    try {
      aiExtraction = await this.cvExtractor.extract(cvText)
      if (aiExtraction) {
        const updateData: Record<string, unknown> = {}

        // Only auto-fill skills if the user hasn't set them yet
        if (profile.skills.length === 0 && aiExtraction.skills.length > 0) {
          updateData.skills = aiExtraction.skills
        }
        if (profile.targetRoles.length === 0 && aiExtraction.suggestedRoles.length > 0) {
          updateData.targetRoles = aiExtraction.suggestedRoles
        }
        if (profile.targetSectors.length === 0 && aiExtraction.suggestedSectors.length > 0) {
          updateData.targetSectors = aiExtraction.suggestedSectors
        }
        if (profile.experienceYears === 0 && aiExtraction.experienceYears) {
          updateData.experienceYears = aiExtraction.experienceYears
        }

        if (Object.keys(updateData).length > 0) {
          profile = await this.profileService.updateProfile(user, updateData)
        }
      }
    } catch {
      // AI extraction failure is not critical — raw text is already saved
    }

    return response.ok({
      data: this.serializeProfile(profile),
      aiExtraction,
      message: aiExtraction
        ? 'CV uploaded, parsed and analyzed by AI'
        : 'CV uploaded and parsed successfully',
    })
  }

  async completeOnboarding({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    try {
      const profile = await this.profileService.completeOnboarding(user)
      return response.ok({
        data: this.serializeProfile(profile),
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
    onboardingCompleted: boolean
    createdAt: unknown
    updatedAt: unknown
  }) {
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
      onboardingCompleted: profile.onboardingCompleted,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    }
  }
}
