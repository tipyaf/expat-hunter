import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import ProfileService from '#services/profile_service'
import ChatAssistantService from '#services/chat_assistant_service'


const step1Schema = vine.compile(
  vine.object({
    step: vine.literal(1),
    data: vine.object({
      fullName: vine.string().trim().optional(),
      targetCountries: vine.array(vine.string().trim()).optional(),
      targetSectors: vine.array(vine.string().trim()).optional(),
      targetRoles: vine.array(vine.string().trim()).optional(),
    }),
  })
)

const step2Schema = vine.compile(
  vine.object({
    step: vine.literal(2),
    data: vine.object({}),
  })
)

const step3Schema = vine.compile(
  vine.object({
    step: vine.literal(3),
    data: vine.object({
      experienceYears: vine.number().min(0).max(50).optional(),
      skills: vine.array(vine.string().trim()).optional(),
      preferences: vine.record(vine.any()).optional(),
    }),
  })
)

const refineSchema = vine.compile(
  vine.object({
    message: vine.string().trim().maxLength(2000),
  })
)

export default class OnboardingController {
  private readonly profileService = new ProfileService()
  private readonly chatService = new ChatAssistantService()

  /**
   * POST /api/onboarding
   * Multi-step onboarding completion
   */
  async complete({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const rawBody = request.body() as { step?: unknown; data?: unknown }
    const step = rawBody.step

    if (step === 1) return this.handleStep1(user, request, response)
    if (step === 2) return this.handleStep2(user, response)
    if (step === 3) return this.handleStep3(user, request, response)

    return response.badRequest({
      error: { code: 'INVALID_STEP', message: 'step must be 1, 2, or 3' },
    })
  }

  private async handleStep1(user: any, request: any, response: any) {
    const payload = await request.validateUsing(step1Schema)

    if (payload.data.fullName) {
      user.fullName = payload.data.fullName
      await user.save()
    }

    const updateData: Record<string, unknown> = {}
    if (payload.data.targetCountries !== undefined) {
      updateData.targetCountries = payload.data.targetCountries
    }
    if (payload.data.targetSectors !== undefined) {
      updateData.targetSectors = payload.data.targetSectors
    }
    if (payload.data.targetRoles !== undefined) {
      updateData.targetRoles = payload.data.targetRoles
    }

    const profile = await this.profileService.updateProfile(user, updateData)

    return response.ok({
      step: 1,
      completed: false,
      profile: this.serializeProfile(profile),
    })
  }

  private async handleStep2(user: any, response: any) {
    const profile = await this.profileService.getOrCreateProfile(user)
    const hasCv = Boolean(profile.cvText)

    return response.ok({
      step: 2,
      completed: false,
      hasCv,
      profile: this.serializeProfile(profile),
    })
  }

  private async handleStep3(user: any, request: any, response: any) {
    const payload = await request.validateUsing(step3Schema)

    const updateData: Record<string, unknown> = {}
    if (payload.data.experienceYears !== undefined) {
      updateData.experienceYears = payload.data.experienceYears
    }
    if (payload.data.skills !== undefined) {
      updateData.skills = payload.data.skills
    }
    if (payload.data.preferences !== undefined) {
      updateData.preferences = payload.data.preferences as Record<string, unknown>
    }

    await this.profileService.updateProfile(user, updateData)

    // Mark onboarding as completed + create follow-up sequence
    const profile = await this.profileService.markOnboardingCompleted(user)

    return response.ok({
      step: 3,
      completed: true,
      profile: this.serializeProfile(profile),
    })
  }

  /**
   * POST /api/onboarding/refine
   * Conversational IA refinement of profile
   */
  async refine({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(refineSchema)

    const profile = await this.profileService.getOrCreateProfile(user)

    const sessionId = `onboarding-refine-${user.id}`

    const result = await this.chatService.processMessage(user.id, sessionId, payload.message, {
      page: 'onboarding',
    })

    // Suggest updates based on profile gaps
    const suggestedUpdates: Partial<{
      skills: string[]
      targetCountries: string[]
      targetRoles: string[]
      experienceYears: number
    }> = {}

    if (profile.skills.length === 0) {
      suggestedUpdates.skills = []
    }

    return response.ok({
      message: result.message,
      suggestedUpdates: Object.keys(suggestedUpdates).length > 0 ? suggestedUpdates : undefined,
    })
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
      isOnboarded: profile.onboardingCompleted,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    }
  }
}
