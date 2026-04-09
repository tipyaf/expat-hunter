/**
 * AI prompt builders for application email generation.
 * The application email is a short (3-4 line) message that accompanies the CV and cover letter attachments.
 */

export interface ApplicationEmailContext {
  candidateName: string
  offerTitle: string
  companyName: string
  country: string
  cvSummary: string
  coverLetterSummary: string
}

export const COUNTRY_TONE_MAP: Record<string, string> = {
  NZ: 'casual-professional',
  AU: 'casual-professional',
  FR: 'formal',
  BE: 'formal',
  GB: 'professional',
  CA: 'professional',
  DE: 'professional',
  NL: 'professional',
  SG: 'professional',
  AE: 'professional',
  CH: 'formal',
}

const DEFAULT_TONE = 'professional'
const MAX_EMAIL_LINES = 6
const MAX_EMAIL_LENGTH = 2000

function sanitizeForPrompt(text: string): string {
  return text.replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function buildApplicationEmailPrompt(
  context: ApplicationEmailContext
): { system: string; user: string } {
  const tone = COUNTRY_TONE_MAP[context.country] ?? DEFAULT_TONE

  const system = `You are an expert career advisor writing a short application email.

Your task: write a brief email body (3-4 lines maximum) that introduces the candidate and references the attached CV and cover letter.

Rules:
- Tone: ${tone}
- Be concise — this is NOT a cover letter. It is the email body that accompanies PDF attachments.
- Maximum ${MAX_EMAIL_LINES} lines
- Address the hiring team or company by name if provided
- Mention that CV and cover letter are attached
- Return ONLY the email body text (no subject line, no greeting like "Subject:", no markdown fences)`

  const user = `## Candidate
- **Name**: ${sanitizeForPrompt(context.candidateName)}
- **CV Summary**: ${sanitizeForPrompt(context.cvSummary)}
- **Cover Letter Summary**: ${sanitizeForPrompt(context.coverLetterSummary)}

## Job Offer
- **Title**: ${sanitizeForPrompt(context.offerTitle)}
- **Company**: ${sanitizeForPrompt(context.companyName)}
- **Country**: ${sanitizeForPrompt(context.country)}

Write a short application email body (3-4 lines).`

  return { system, user }
}

export function parseApplicationEmailResponse(raw: string): string | null {
  let cleaned = raw.trim()

  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:\w+)?\n?/, '').replace(/\n?```$/, '')
  }

  cleaned = cleaned.trim()

  if (cleaned.length === 0) {
    return null
  }

  if (cleaned.length > MAX_EMAIL_LENGTH) {
    return cleaned.slice(0, MAX_EMAIL_LENGTH)
  }

  return cleaned
}
