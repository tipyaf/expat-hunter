import AiSetting from '#models/ai_setting'
import type { FeatureKey } from '#models/ai_setting'
import env from '#start/env'

export interface AiConfig {
  model: string
  temperature: number
  maxTokens: number
  isEnabled: boolean
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export default class AiSettingsService {
  private static cache = new Map<string, { config: AiConfig; expiresAt: number }>()

  static invalidateCache() {
    this.cache.clear()
  }

  static async getConfig(featureKey: FeatureKey): Promise<AiConfig> {
    const cached = this.cache.get(featureKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.config
    }

    // Try feature-specific row
    const featureRow = await AiSetting.findBy('featureKey', featureKey)
    if (featureRow) {
      const config: AiConfig = {
        model: featureRow.model,
        temperature: featureRow.temperature,
        maxTokens: featureRow.maxTokens,
        isEnabled: featureRow.isEnabled,
      }
      this.cache.set(featureKey, { config, expiresAt: Date.now() + CACHE_TTL })
      return config
    }

    // Fallback to default row
    if (featureKey !== 'default') {
      const defaultRow = await AiSetting.findBy('featureKey', 'default')
      if (defaultRow) {
        const config: AiConfig = {
          model: defaultRow.model,
          temperature: defaultRow.temperature,
          maxTokens: defaultRow.maxTokens,
          isEnabled: defaultRow.isEnabled,
        }
        this.cache.set(featureKey, { config, expiresAt: Date.now() + CACHE_TTL })
        return config
      }
    }

    // Fallback to env vars
    const config: AiConfig = {
      model: env.get('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
      temperature: 0.3,
      maxTokens: 1024,
      isEnabled: true,
    }
    this.cache.set(featureKey, { config, expiresAt: Date.now() + CACHE_TTL })
    return config
  }

  static async getAll(): Promise<AiSetting[]> {
    return AiSetting.query().orderBy('featureKey', 'asc')
  }

  static async upsert(featureKey: FeatureKey, data: Partial<AiConfig>): Promise<AiSetting> {
    let setting = await AiSetting.findBy('featureKey', featureKey)

    if (setting) {
      if (data.model !== undefined) setting.model = data.model
      if (data.temperature !== undefined) setting.temperature = data.temperature
      if (data.maxTokens !== undefined) setting.maxTokens = data.maxTokens
      if (data.isEnabled !== undefined) setting.isEnabled = data.isEnabled
      await setting.save()
    } else {
      setting = await AiSetting.create({
        featureKey,
        model: data.model ?? env.get('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
        temperature: data.temperature ?? 0.3,
        maxTokens: data.maxTokens ?? 1024,
        isEnabled: data.isEnabled ?? true,
      })
    }

    this.invalidateCache()
    return setting
  }
}
