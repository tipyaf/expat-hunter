import type { CompanyType } from '@expat-hunter/shared'

export interface CoverLetterContext {
  cvText: string
  offerTitle: string
  offerDescription: string | null
  companyName: string | null
  companySector: string | null
  companySize: string | null
  companyType: CompanyType | null
  applicationAdvice: string | null
  language: string
}

export interface CoverLetterRefinementContext extends CoverLetterContext {
  previousCoverLetter: string
  userInstruction: string
}

export interface CoverLetterResult {
  coverLetterText: string
}

const MAX_CV_LENGTH = 8000
const MAX_DESCRIPTION_LENGTH = 5000
export const MAX_COVER_LETTER_LENGTH = 10000

const RECRUITMENT_AGENCY_TYPE: CompanyType = 'recruitment_agency'

const PARAGRAPH_COUNT_MIN = 3
const PARAGRAPH_COUNT_MAX = 5

function sanitizeForPrompt(text: string): string {
  return text.replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '... (truncated)'
}

export function buildCoverLetterPrompt(
  context: CoverLetterContext
): { system: string; user: string } {
  const cvText = truncate(sanitizeForPrompt(context.cvText), MAX_CV_LENGTH)
  const description = context.offerDescription
    ? truncate(sanitizeForPrompt(context.offerDescription), MAX_DESCRIPTION_LENGTH)
    : 'No description available'

  const isAgency = context.companyType === RECRUITMENT_AGENCY_TYPE
  const languageLabel = context.language === 'fr' ? 'French' : 'English'

  const system = `You are an expert career advisor specializing in cover letter writing for expats.

Your task: generate a professional cover letter (${PARAGRAPH_COUNT_MIN}-${PARAGRAPH_COUNT_MAX} paragraphs) tailored to the job offer and candidate profile.

Rules:
- Adapt tone and style to ${languageLabel}
- Mention the specific company and role by name
- Highlight relevant skills and achievements from the candidate's CV
- Do NOT repeat the CV verbatim — synthesize and contextualize
- Return ONLY the cover letter text (no JSON, no markdown fences, no extra formatting)
- Write the cover letter in ${languageLabel}`

  const companyInfo = buildCompanyInfo(context, isAgency)

  const adviceInfo = context.applicationAdvice
    ? `\n\n## Application Advice (from AI evaluation)\n${sanitizeForPrompt(context.applicationAdvice)}`
    : ''

  const user = `## Job Offer
- **Title**: ${sanitizeForPrompt(context.offerTitle)}
${companyInfo}
- **Description**: ${description}
${adviceInfo}

## Candidate CV
${cvText}

Write a professional cover letter for this job offer.`

  return { system, user }
}

function buildCompanyInfo(context: CoverLetterContext, isAgency: boolean): string {
  if (!context.companyName) {
    return ''
  }

  const companyLine = `- **Company**: ${sanitizeForPrompt(context.companyName)}`

  if (isAgency) {
    return companyLine
  }

  const sectorSuffix = context.companySector ? ` (${sanitizeForPrompt(context.companySector)})` : ''
  const sizeLine = context.companySize ? `\n- **Company Size**: ${sanitizeForPrompt(context.companySize)}` : ''

  return `${companyLine}${sectorSuffix}${sizeLine}`
}

export function buildCoverLetterRefinementPrompt(
  context: CoverLetterRefinementContext
): { system: string; user: string } {
  const cvText = truncate(sanitizeForPrompt(context.cvText), MAX_CV_LENGTH)
  const description = context.offerDescription
    ? truncate(sanitizeForPrompt(context.offerDescription), MAX_DESCRIPTION_LENGTH)
    : 'No description available'

  const languageLabel = context.language === 'fr' ? 'French' : 'English'

  const system = `You are an expert career advisor specializing in cover letter writing.

The candidate has already received a cover letter and wants refinements based on additional instructions.

Rules:
- Take into account the user's refinement instruction
- You may rewrite, adjust tone, add or remove content as needed
- Write the cover letter in ${languageLabel}
- Return ONLY the cover letter text (no JSON, no markdown fences, no extra formatting)`

  const user = `## Job Offer
- **Title**: ${sanitizeForPrompt(context.offerTitle)}
- **Description**: ${description}

## Previous Cover Letter
${sanitizeForPrompt(context.previousCoverLetter)}

## User Instruction
${sanitizeForPrompt(context.userInstruction)}

## Original CV
${cvText}

Refine the cover letter based on the user's instruction.`

  return { system, user }
}

export function parseCoverLetterResponse(raw: string): string | null {
  let cleaned = raw.trim()

  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:\w+)?\n?/, '').replace(/\n?```$/, '')
  }

  cleaned = cleaned.trim()

  if (cleaned.length === 0) {
    return null
  }

  if (cleaned.length > MAX_COVER_LETTER_LENGTH) {
    return cleaned.slice(0, MAX_COVER_LETTER_LENGTH)
  }

  return cleaned
}
