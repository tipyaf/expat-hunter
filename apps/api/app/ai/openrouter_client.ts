/**
 * OpenRouterClient — Generic client for OpenRouter API (chat completions).
 *
 * Supports any model available on OpenRouter (GPT-4o-mini, Claude 3 Haiku, etc.).
 * Configuration via OPENROUTER_API_KEY and OPENROUTER_MODEL env vars.
 */
import type { FeatureKey } from '#models/ai_setting'
import AiSettingsService from '#services/ai_settings_service'
import env from '#start/env'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatParams {
  model?: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
}

interface OpenRouterResponse {
  choices: { message: { content: string } }[]
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

export default class OpenRouterClient {
  private apiKey: string
  private defaultModel: string
  private defaultTemperature: number
  private defaultMaxTokens: number
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions'

  constructor(config?: { model?: string; temperature?: number; maxTokens?: number }) {
    this.apiKey = env.get('OPENROUTER_API_KEY', '')
    this.defaultModel = config?.model ?? env.get('OPENROUTER_MODEL', 'openai/gpt-4o-mini')
    this.defaultTemperature = config?.temperature ?? 0.3
    this.defaultMaxTokens = config?.maxTokens ?? 1024
  }

  static async forFeature(featureKey: FeatureKey): Promise<OpenRouterClient | null> {
    const config = await AiSettingsService.getConfig(featureKey)
    if (!config.isEnabled) {
      return null
    }
    return new OpenRouterClient({
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    })
  }

  get isConfigured(): boolean {
    return this.apiKey.length > 0
  }

  async chat(params: ChatParams): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('OpenRouter API key not configured. Set OPENROUTER_API_KEY in .env')
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://expathunter.app',
        'X-Title': 'ExpatHunter',
      },
      body: JSON.stringify({
        model: params.model ?? this.defaultModel,
        messages: params.messages,
        temperature: params.temperature ?? this.defaultTemperature,
        max_tokens: params.maxTokens ?? this.defaultMaxTokens,
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => 'Unknown error')
      throw new Error(`OpenRouter API error (${response.status}): ${body}`)
    }

    const data = (await response.json()) as OpenRouterResponse

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('OpenRouter returned an empty response')
    }

    return data.choices[0].message.content
  }
}
