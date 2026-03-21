import OpenRouterClient from '#ai/openrouter_client'
import {
  buildEmailPrompt,
  parseEmailResponse,
  type CandidateForEmail,
  type ContactForEmail,
  type EmailGenerationResult,
} from '#ai/prompts/email_prompt'

export class EmailComposer {
  private client: OpenRouterClient

  constructor(client?: OpenRouterClient) {
    this.client = client ?? new OpenRouterClient()
  }

  get isConfigured(): boolean {
    return this.client.isConfigured
  }

  async compose(
    contact: ContactForEmail,
    candidate: CandidateForEmail,
    options?: { type?: 'initial' | 'follow_up_1' | 'follow_up_2' | 'follow_up_3'; previousEmail?: string }
  ): Promise<EmailGenerationResult> {
    const { system, user } = buildEmailPrompt(contact, candidate, options)

    const raw = await this.client.chat({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.5,
      maxTokens: 600,
    })

    return parseEmailResponse(raw)
  }
}
