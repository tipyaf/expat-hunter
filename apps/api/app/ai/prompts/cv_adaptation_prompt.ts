export interface CvAdaptationContext {
  cvText: string
  offerTitle: string
  offerDescription: string | null
  companyName: string | null
  companySector: string | null
  applicationAdvice: string | null
  language: string
}

export interface CvAdaptationRefinementContext extends CvAdaptationContext {
  previousReplacements: CvReplacementItem[]
  userInstruction: string
}

export interface CvReplacementItem {
  oldText: string
  newText: string
}

export interface CvAdaptationResult {
  replacements: CvReplacementItem[]
}

const MAX_CV_LENGTH = 8000
const MAX_DESCRIPTION_LENGTH = 5000
const MAX_REPLACEMENTS = 7

function sanitizeForPrompt(text: string): string {
  return text.replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '... (truncated)'
}

export function buildCvAdaptationPrompt(
  context: CvAdaptationContext
): { system: string; user: string } {
  const cvText = truncate(sanitizeForPrompt(context.cvText), MAX_CV_LENGTH)
  const description = context.offerDescription
    ? truncate(sanitizeForPrompt(context.offerDescription), MAX_DESCRIPTION_LENGTH)
    : 'No description available'

  const system = `You are an expert career advisor specializing in CV optimization for expats.

Your task: analyze the candidate's CV and the target job offer, then suggest up to ${MAX_REPLACEMENTS} targeted text replacements to better align the CV with the offer.

Rules:
- Return EXACTLY a JSON object with a "replacements" array
- Each replacement has "oldText" (exact text from the CV) and "newText" (improved version)
- Maximum ${MAX_REPLACEMENTS} replacements — focus on the highest-impact changes
- oldText MUST be an exact substring of the original CV (case-sensitive)
- Keep the same overall structure and length — only adjust wording, emphasis, and keywords
- Match the language of the CV: write replacements in ${context.language === 'fr' ? 'French' : 'English'}
- Focus on: relevant keywords, quantified achievements, skills alignment, job title matching
- Do NOT invent experience or qualifications the candidate doesn't have
- If the CV is already well-suited, return an empty replacements array

Respond ONLY with valid JSON (no markdown, no comments):
{
  "replacements": [
    { "oldText": "exact text from CV", "newText": "improved version" }
  ]
}`

  const sectorSuffix = context.companySector ? ` (${sanitizeForPrompt(context.companySector)})` : ''
  const companyInfo = context.companyName
    ? `- **Company**: ${sanitizeForPrompt(context.companyName)}${sectorSuffix}`
    : ''

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

Suggest up to ${MAX_REPLACEMENTS} targeted replacements to optimize this CV for the job offer above.`

  return { system, user }
}

export function buildCvRefinementPrompt(
  context: CvAdaptationRefinementContext
): { system: string; user: string } {
  const cvText = truncate(sanitizeForPrompt(context.cvText), MAX_CV_LENGTH)
  const description = context.offerDescription
    ? truncate(sanitizeForPrompt(context.offerDescription), MAX_DESCRIPTION_LENGTH)
    : 'No description available'

  const previousReplacementsBlock = context.previousReplacements.length > 0
    ? context.previousReplacements
        .map((r, i) => `${i + 1}. "${sanitizeForPrompt(r.oldText)}" → "${sanitizeForPrompt(r.newText)}"`)
        .join('\n')
    : 'None'

  const system = `You are an expert career advisor specializing in CV optimization.

The candidate has already received CV adaptation suggestions and wants refinements based on additional instructions.

Rules:
- Return EXACTLY a JSON object with a "replacements" array
- Each replacement has "oldText" (exact text from the ORIGINAL CV) and "newText" (improved version)
- Maximum ${MAX_REPLACEMENTS} replacements
- oldText MUST be an exact substring of the original CV (case-sensitive)
- Take into account the user's refinement instruction
- You may keep, modify, or discard previous replacements as needed
- Match the language: write replacements in ${context.language === 'fr' ? 'French' : 'English'}
- Do NOT invent experience or qualifications

Respond ONLY with valid JSON (no markdown, no comments):
{
  "replacements": [
    { "oldText": "exact text from CV", "newText": "improved version" }
  ]
}`

  const user = `## Job Offer
- **Title**: ${sanitizeForPrompt(context.offerTitle)}
- **Description**: ${description}

## Previous Replacements
${previousReplacementsBlock}

## User Instruction
${sanitizeForPrompt(context.userInstruction)}

## Original CV
${cvText}

Generate new replacements taking the user's instruction into account.`

  return { system, user }
}

export function parseCvAdaptationResponse(raw: string): CvAdaptationResult | null {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const jsonMatch = /\{[\s\S]*\}/.exec(cleaned)
  if (!jsonMatch) {
    return null
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>

    if (!Array.isArray(parsed.replacements)) {
      return { replacements: [] }
    }

    const replacements: CvReplacementItem[] = parsed.replacements
      .slice(0, MAX_REPLACEMENTS)
      .filter(
        (r: unknown): r is { oldText: string; newText: string } =>
          typeof r === 'object' &&
          r !== null &&
          typeof (r as Record<string, unknown>).oldText === 'string' &&
          (r as Record<string, unknown>).oldText !== '' &&
          typeof (r as Record<string, unknown>).newText === 'string' &&
          (r as Record<string, unknown>).newText !== ''
      )
      .map((r) => ({
        oldText: r.oldText,
        newText: r.newText,
      }))

    return { replacements }
  } catch {
    return null
  }
}
