/**
 * AI prompt builders for follow-up / thank-you emails to recruitment contacts.
 * These are NOT cold outreach emails — they are warm follow-ups during an active recruitment process.
 */

export type FollowUpEmailType = 'follow_up' | 'thank_you' | 'status_check'

export interface FollowUpEmailContext {
  type: FollowUpEmailType
  contactName: string
  contactRole: string
  companyName: string
  context: string
}

const TYPE_INSTRUCTIONS: Record<FollowUpEmailType, string> = {
  thank_you: 'Write a thank-you email after an interaction (interview, meeting, call). Express gratitude, reference specific topics discussed, and reaffirm interest in the position.',
  follow_up: 'Write a polite follow-up email to check on the status of an application. Be respectful of their time, mention when you applied, and express continued interest.',
  status_check: 'Write a brief, professional status check email. Ask about the current stage of the recruitment process and whether any additional information is needed.',
}

function sanitizeForPrompt(text: string): string {
  return text.replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function buildFollowUpEmailPrompt(
  context: FollowUpEmailContext
): { system: string; user: string } {
  const typeInstruction = TYPE_INSTRUCTIONS[context.type] ?? TYPE_INSTRUCTIONS.follow_up

  const system = `You are an expert career advisor writing a follow-up email during a recruitment process.

${typeInstruction}

Rules:
- Keep it concise (5-8 lines maximum)
- Professional and warm tone
- Address the recipient by name
- Reference the specific context provided
- This is a warm email to someone you have interacted with — NOT a cold outreach
- Return ONLY the email body text (no subject line, no markdown fences)`

  const user = `## Recipient
- **Name**: ${sanitizeForPrompt(context.contactName)}
- **Role**: ${sanitizeForPrompt(context.contactRole)}
- **Company**: ${sanitizeForPrompt(context.companyName)}

## Context
${sanitizeForPrompt(context.context)}

Write a ${context.type.replace('_', ' ')} email.`

  return { system, user }
}

export function parseFollowUpEmailResponse(raw: string): string | null {
  let cleaned = raw.trim()

  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:\w+)?\n?/, '').replace(/\n?```$/, '')
  }

  cleaned = cleaned.trim()

  if (cleaned.length === 0) {
    return null
  }

  return cleaned
}
