/**
 * CvExtractor — Extracts structured profile data from raw CV text using OpenRouter AI.
 *
 * Calls OpenRouter with a prompt to extract skills, roles, sectors and experience from CV text.
 * Falls back gracefully if OpenRouter is not configured (returns null).
 */
import OpenRouterClient from './openrouter_client.js'
import {
  type CvExtractionResult,
  buildCvExtractionPrompt,
  parseCvExtractionResponse,
} from './prompts/cv_extraction_prompt.js'

export default class CvExtractor {
  private readonly client: OpenRouterClient

  constructor(client?: OpenRouterClient) {
    this.client = client ?? new OpenRouterClient()
  }

  /**
   * Extract structured data from raw CV text.
   * Returns null if OpenRouter is not configured (graceful degradation).
   */
  async extract(cvText: string): Promise<CvExtractionResult | null> {
    if (!this.client.isConfigured) {
      return null
    }

    if (!cvText.trim()) {
      return null
    }

    const prompt = buildCvExtractionPrompt(cvText)

    const raw = await this.client.chat({
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      temperature: 0.2,
      maxTokens: 800,
    })

    return parseCvExtractionResponse(raw)
  }
}
