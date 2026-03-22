import AiSetting from '#models/ai_setting'
import FollowUpSequence from '#models/follow_up_sequence'

export interface AdminEmailLimits {
  maxFollowUps: number
  minFollowUpDelay: number
  minFollowUpDelayUnit: 'days' | 'weeks' | 'months'
}

export interface SendingSettings {
  followUps: Array<{ delayDays: number }>
  limits: AdminEmailLimits
}

const DEFAULT_LIMITS: AdminEmailLimits = {
  maxFollowUps: 3,
  minFollowUpDelay: 1,
  minFollowUpDelayUnit: 'days',
}

export default class SendingSettingsService {
  async getAdminLimits(): Promise<AdminEmailLimits> {
    const [followUpsSetting, delaySetting] = await Promise.all([
      AiSetting.findBy('featureKey', 'email_follow_ups'),
      AiSetting.findBy('featureKey', 'email_follow_up_delay'),
    ])

    return {
      maxFollowUps: (followUpsSetting?.value as { max_follow_ups?: number } | null)?.max_follow_ups
        ?? DEFAULT_LIMITS.maxFollowUps,
      minFollowUpDelay: (delaySetting?.value as { min_delay?: number } | null)?.min_delay
        ?? DEFAULT_LIMITS.minFollowUpDelay,
      minFollowUpDelayUnit: (delaySetting?.value as { min_delay_unit?: 'days' | 'weeks' | 'months' } | null)?.min_delay_unit
        ?? DEFAULT_LIMITS.minFollowUpDelayUnit,
    }
  }

  async updateAdminLimits(data: {
    maxFollowUps?: number
    minFollowUpDelay?: number
    minFollowUpDelayUnit?: 'days' | 'weeks' | 'months'
  }): Promise<AdminEmailLimits> {
    if (data.maxFollowUps !== undefined) {
      const existing = await AiSetting.findBy('featureKey', 'email_follow_ups')
      if (existing) {
        existing.value = { max_follow_ups: data.maxFollowUps }
        await existing.save()
      } else {
        await AiSetting.create({
          featureKey: 'email_follow_ups',
          model: 'n/a',
          temperature: 0,
          maxTokens: 0,
          isEnabled: true,
          value: { max_follow_ups: data.maxFollowUps },
        })
      }
    }

    if (data.minFollowUpDelay !== undefined || data.minFollowUpDelayUnit !== undefined) {
      const existing = await AiSetting.findBy('featureKey', 'email_follow_up_delay')
      const current = (existing?.value ?? {}) as { min_delay?: number; min_delay_unit?: string }
      const newValue = {
        min_delay: data.minFollowUpDelay ?? current.min_delay ?? DEFAULT_LIMITS.minFollowUpDelay,
        min_delay_unit: data.minFollowUpDelayUnit ?? current.min_delay_unit ?? DEFAULT_LIMITS.minFollowUpDelayUnit,
      }

      if (existing) {
        existing.value = newValue
        await existing.save()
      } else {
        await AiSetting.create({
          featureKey: 'email_follow_up_delay',
          model: 'n/a',
          temperature: 0,
          maxTokens: 0,
          isEnabled: true,
          value: newValue,
        })
      }
    }

    return this.getAdminLimits()
  }

  async getForUser(userId: string): Promise<SendingSettings> {
    const [limits, sequence] = await Promise.all([
      this.getAdminLimits(),
      FollowUpSequence.findBy('userId', userId),
    ])

    const followUps = [
      { delayDays: sequence?.delayDays1 ?? 7 },
      { delayDays: sequence?.delayDays2 ?? 14 },
      { delayDays: sequence?.delayDays3 ?? 21 },
    ].slice(0, limits.maxFollowUps)

    return { followUps, limits }
  }

  /**
   * Validate that user follow-up config respects admin limits.
   * Returns null if valid, error message if invalid.
   */
  validateFollowUps(
    followUps: Array<{ delayDays: number }>,
    limits: AdminEmailLimits
  ): string | null {
    if (followUps.length > limits.maxFollowUps) {
      return `Nombre de relances maximum atteint (${limits.maxFollowUps})`
    }

    const minDays = this.toMinDays(limits.minFollowUpDelay, limits.minFollowUpDelayUnit)
    for (const fu of followUps) {
      if (fu.delayDays < minDays) {
        return `Délai minimum entre relances : ${limits.minFollowUpDelay} ${limits.minFollowUpDelayUnit}`
      }
    }

    return null
  }

  toMinDays(value: number, unit: 'days' | 'weeks' | 'months'): number {
    if (unit === 'weeks') return value * 7
    if (unit === 'months') return value * 30
    return value
  }
}
