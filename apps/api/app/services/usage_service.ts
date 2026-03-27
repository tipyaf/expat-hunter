import { FREE_QUOTAS, PLAN_PREMIUM } from '@expat-hunter/shared'
import type { QuotaType, UserPlan } from '@expat-hunter/shared'
import UsageCounter from '#models/usage_counter'
import logger from '@adonisjs/core/services/logger'

export interface QuotaInfo {
  used: number
  limit: number | null
  remaining: number | null
}

export interface QuotaCheckResult {
  allowed: boolean
  quota: QuotaInfo
}

export default class UsageService {
  /**
   * Increment a usage counter for a user. Fails open on DB error.
   */
  async increment(userId: string, counterType: QuotaType, amount: number = 1): Promise<number> {
    try {
      const counter = await UsageCounter.firstOrCreate(
        { userId, counterType },
        { userId, counterType, count: 0 }
      )
      counter.count += amount
      await counter.save()
      return counter.count
    } catch (error) {
      logger.warn({ userId, counterType, error }, 'UsageService: failed to increment counter — failing open')
      return 0
    }
  }

  /**
   * Get current usage for a specific counter type.
   */
  async getUsage(userId: string, counterType: QuotaType): Promise<number> {
    const counter = await UsageCounter.query()
      .where('userId', userId)
      .where('counterType', counterType)
      .first()
    return counter?.count ?? 0
  }

  /**
   * Check if a user is allowed to perform an action based on their plan and quota.
   */
  async checkQuota(userId: string, plan: UserPlan, counterType: QuotaType): Promise<QuotaCheckResult> {
    if (plan === PLAN_PREMIUM) {
      return { allowed: true, quota: { used: 0, limit: null, remaining: null } }
    }

    const used = await this.getUsage(userId, counterType)
    const limit = FREE_QUOTAS[counterType]
    const remaining = Math.max(0, limit - used)

    return {
      allowed: used < limit,
      quota: { used, limit, remaining },
    }
  }

  /**
   * Get remaining quota info for a user on a specific counter.
   */
  async getRemainingQuota(userId: string, plan: UserPlan, counterType: QuotaType): Promise<QuotaInfo> {
    if (plan === PLAN_PREMIUM) {
      return { used: 0, limit: null, remaining: null }
    }

    const used = await this.getUsage(userId, counterType)
    const limit = FREE_QUOTAS[counterType]

    return { used, limit, remaining: Math.max(0, limit - used) }
  }
}
