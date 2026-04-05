import OpenRouterClient from '#ai/openrouter_client'
import type EmailReply from '#models/email_reply'
import type EmailMessage from '#models/email_message'

export default class ReplyGenerationService {
  async generateReply(params: {
    contactFullName: string
    companyName: string
    originalEmailBody: string
    replyBody: string
    userProfile?: { fullName: string; cvText?: string }
    language?: string
    targetCountry?: string
  }): Promise<string> {
    const client = await OpenRouterClient.forFeature('chat_assistant')

    if (!client) {
      return params.language === 'fr'
        ? 'La fonctionnalité de suggestion de réponse n\'est pas configurée. Veuillez activer le modèle AI dans les paramètres.'
        : 'Reply suggestion feature is not configured. Please enable the AI model in settings.'
    }

    const language = params.language ?? 'en'
    const country = params.targetCountry ?? ''
    let userProfileText: string
    if (params.userProfile) {
      const backgroundSuffix = params.userProfile.cvText
        ? `. Background: ${params.userProfile.cvText.slice(0, 500)}`
        : ''
      userProfileText = `User: ${params.userProfile.fullName}${backgroundSuffix}`
    } else {
      userProfileText = 'No user profile provided.'
    }

    const prompt = `You are helping write a professional reply to a job application response.

Context:
- Candidate: ${params.contactFullName} at ${params.companyName}
- Original email sent: ${params.originalEmailBody.slice(0, 1000)}
- Reply received: ${params.replyBody.slice(0, 1000)}
- ${userProfileText}
${country ? `- Country context: ${country} cultural norms apply.` : ''}

Write a concise, professional reply in ${language === 'fr' ? 'French' : 'English'}.
The reply should be warm, professional, and culturally appropriate${country ? ` for ${country}` : ''}.
Keep it under 200 words. Return only the email body text, no subject line.`

    try {
      return await client.chat({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        maxTokens: 512,
      })
    } catch {
      return language === 'fr'
        ? 'Impossible de générer une suggestion de réponse pour le moment.'
        : 'Unable to generate a reply suggestion at this time.'
    }
  }

  async summarizeThread(
    replies: EmailReply[],
    originalEmail?: EmailMessage
  ): Promise<string> {
    const client = await OpenRouterClient.forFeature('chat_assistant')

    if (!client) {
      return ''
    }

    const threadParts: string[] = []

    if (originalEmail) {
      threadParts.push(`Original email (${originalEmail.type}):\nSubject: ${originalEmail.subject}\n${originalEmail.body.slice(0, 500)}`)
    }

    for (const reply of replies) {
      threadParts.push(`Reply from ${reply.fromEmail} (${reply.receivedAt.toISO()}):\nSubject: ${reply.subject}\n${(reply.bodyText ?? '').slice(0, 500)}`)
    }

    if (threadParts.length === 0) {
      return ''
    }

    const prompt = `Summarize this email thread in 2-3 sentences:\n\n${threadParts.join('\n\n---\n\n')}`

    try {
      return await client.chat({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        maxTokens: 256,
      })
    } catch {
      return ''
    }
  }
}
