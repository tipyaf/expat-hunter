import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import ChatAssistantService from '#services/chat_assistant_service'
import ProfileService from '#services/profile_service'

const chatMessageSchema = vine.compile(
  vine.object({
    message: vine.string().trim().maxLength(2000),
    sessionId: vine.string().trim().maxLength(64),
    page: vine.string().trim().optional(),
    contactId: vine.string().trim().optional(),
    companyName: vine.string().trim().optional(),
    country: vine.string().trim().optional(),
  })
)

export default class ChatController {
  private chatService = new ChatAssistantService()
  private profileService = new ProfileService()

  /**
   * POST /api/assistant/chat
   */
  async chat({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const payload = await request.validateUsing(chatMessageSchema)

    // Load user profile for enhanced expert context (F14.7)
    let userProfile: { cvText?: string; skills?: string[]; experienceYears?: number } | undefined
    try {
      const profile = await this.profileService.getProfile(user.id)
      if (profile) {
        userProfile = {
          cvText: profile.cvText ?? undefined,
          skills: profile.skills,
          experienceYears: profile.experienceYears,
        }
      }
    } catch {
      // Non-critical — expert will work without profile context
    }

    try {
      const result = await this.chatService.processMessage(
        user.id,
        payload.sessionId,
        payload.message,
        {
          page: payload.page ?? 'other',
          contactId: payload.contactId,
          companyName: payload.companyName,
          country: payload.country,
        },
        userProfile
      )

      return response.ok({ data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error in chat service'
      return response.internalServerError({
        message: `Chat assistant error: ${message}`,
      })
    }
  }

  /**
   * GET /api/assistant/chat/:sessionId
   */
  async history({ params, response }: HttpContext) {
    const { sessionId } = params
    const history = this.chatService.getHistory(sessionId as string)
    return response.ok({ data: history })
  }
}
