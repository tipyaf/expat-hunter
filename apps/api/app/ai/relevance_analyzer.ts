/**
 * RelevanceAnalyzer — Orchestrates contact relevance analysis using OpenRouter.
 *
 * Takes a contact+company and a candidate profile, calls the LLM,
 * and returns a structured relevance result.
 */
import OpenRouterClient from '#ai/openrouter_client'
import {
  buildRelevanceAnalysisPrompt,
  parseRelevanceAnalysisResponse,
  type CandidateForAnalysis,
  type ContactForAnalysis,
  type RelevanceAnalysisResult,
} from '#ai/prompts/relevance_analysis_prompt'

export class RelevanceAnalyzer {
  private readonly client: OpenRouterClient

  constructor(client?: OpenRouterClient) {
    this.client = client ?? new OpenRouterClient()
  }

  get isConfigured(): boolean {
    return this.client.isConfigured
  }

  async analyze(
    contact: ContactForAnalysis,
    candidate: CandidateForAnalysis
  ): Promise<RelevanceAnalysisResult> {
    const { system, user } = buildRelevanceAnalysisPrompt(contact, candidate)

    const raw = await this.client.chat({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      maxTokens: 512,
    })

    return parseRelevanceAnalysisResponse(raw)
  }
}
