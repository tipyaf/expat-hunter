/**
 * CustomPlatformService — CRUD for user-defined job platforms.
 *
 * Enforces: per-user URL uniqueness, userId scoping, free-plan limits.
 */
import {
  PLAN_PREMIUM,
  FREE_MAX_CUSTOM_PLATFORMS,
} from '@expat-hunter/shared'
import type { UserPlan, CreateCustomPlatformPayload, PlatformSuggestion } from '@expat-hunter/shared'
import { PLATFORM_SUGGESTIONS } from '@expat-hunter/shared'
import CustomPlatform from '#models/custom_platform'
import logger from '@adonisjs/core/services/logger'

export default class CustomPlatformService {
  /**
   * Create a custom platform for a user.
   * Enforces: unique URL per user, free-plan limit.
   */
  async create(
    userId: string,
    plan: UserPlan,
    data: CreateCustomPlatformPayload
  ): Promise<CustomPlatform> {
    // Normalize URL: strip trailing slash for uniqueness comparison
    const normalizedUrl = data.url.replace(/\/+$/, '')

    // Check free-plan limit
    if (plan !== PLAN_PREMIUM) {
      const count = await this.countForUser(userId)
      if (count >= FREE_MAX_CUSTOM_PLATFORMS) {
        const error = new Error(
          `Free users can add up to ${FREE_MAX_CUSTOM_PLATFORMS} custom platforms. Upgrade to premium for unlimited.`
        )
        ;(error as Error & { status: number }).status = 403
        ;(error as Error & { code: string }).code = 'QUOTA_EXCEEDED'
        throw error
      }
    }

    // Check duplicate URL for this user
    const existing = await CustomPlatform.query()
      .where('userId', userId)
      .where('url', normalizedUrl)
      .first()

    if (existing) {
      const error = new Error('This platform URL already exists in your list.')
      ;(error as Error & { status: number }).status = 409
      ;(error as Error & { code: string }).code = 'DUPLICATE_PLATFORM'
      throw error
    }

    const platform = await CustomPlatform.create({
      userId,
      name: data.name,
      url: normalizedUrl,
      country: data.country ?? null,
      isActive: true,
    })

    logger.info({ userId, platformId: platform.id }, 'CustomPlatformService: platform created')
    return platform
  }

  /**
   * List all custom platforms for a user (scoped to userId).
   */
  async list(userId: string): Promise<CustomPlatform[]> {
    return CustomPlatform.query()
      .where('userId', userId)
      .orderBy('createdAt', 'desc')
  }

  /**
   * Delete a custom platform (scoped to userId).
   */
  async remove(userId: string, platformId: string): Promise<void> {
    const platform = await CustomPlatform.query()
      .where('id', platformId)
      .where('userId', userId)
      .first()

    if (!platform) {
      const error = new Error('Custom platform not found')
      ;(error as Error & { status: number }).status = 404
      ;(error as Error & { code: string }).code = 'NOT_FOUND'
      throw error
    }

    await platform.delete()
    logger.info({ userId, platformId }, 'CustomPlatformService: platform deleted')
  }

  /**
   * Get platform suggestions for a country.
   */
  getSuggestions(country: string): PlatformSuggestion[] {
    return PLATFORM_SUGGESTIONS[country.toUpperCase()] ?? []
  }

  /**
   * Count custom platforms for a user (quota enforcement).
   */
  private async countForUser(userId: string): Promise<number> {
    const result = await CustomPlatform.query()
      .where('userId', userId)
      .count('* as total')

    return Number(result[0].$extras.total)
  }
}
