/**
 * Prompt builder and response parser for job offer AI evaluation.
 *
 * Builds system+user prompt from candidate profile + offer + exclusion history,
 * parses structured JSON response with relevanceScore, matchSummary,
 * selectionReason, and applicationAdvice.
 */
import { MAX_DESCRIPTION_LENGTH } from '@expat-hunter/shared'
import { LOCALE_NAMES } from '../../constants/locale.js'

const DEFAULT_LOCALE = 'en'

export interface JobOfferForEvaluation {
  title: string
  descriptionRaw: string | null
  location: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  remoteType: string | null
}

export interface CandidateForEvaluation {
  skills: string[]
  experienceYears: number
  targetCountries: string[]
  targetSectors: string[]
  targetRoles: string[]
  cvSummary: string | null
}

export interface ExclusionForPrompt {
  category: string
  reason: string
}

export interface JobEvaluationResult {
  relevanceScore: number
  matchSummary: string
  selectionReason: string
  applicationAdvice: string
}

export function buildJobEvaluationPrompt(
  offer: JobOfferForEvaluation,
  profile: CandidateForEvaluation,
  exclusions: ExclusionForPrompt[],
  locale?: string
): { system: string; user: string } {
  const safeLocale = locale && locale in LOCALE_NAMES ? locale : DEFAULT_LOCALE
  const languageName = LOCALE_NAMES[safeLocale] ?? LOCALE_NAMES[DEFAULT_LOCALE]
  const exclusionLines = exclusions.map(
    (e) => '- [' + e.category + '] ' + e.reason
  )
  const exclusionBlock =
    exclusions.length > 0
      ? '\n\nThe candidate has previously excluded offers for these reasons (use as negative preferences):\n' +
        exclusionLines.join('\n')
      : ''

  const description = offer.descriptionRaw
    ? offer.descriptionRaw.slice(0, MAX_DESCRIPTION_LENGTH)
    : 'No description available'

  const descriptionTruncated =
    offer.descriptionRaw && offer.descriptionRaw.length > MAX_DESCRIPTION_LENGTH
      ? ' (truncated)'
      : ''

  return {
    system: `You are an expert career advisor specialized in international job markets and expat employment.

Your role: evaluate how well a job offer matches a candidate's profile and provide actionable advice.

Respond ONLY with a valid JSON object (no markdown, no comments):
{
  "relevanceScore": <number 0-100>,
  "matchSummary": "<2-3 sentences explaining the match quality>",
  "selectionReason": "<1-2 sentences explaining why this offer was selected or not>",
  "applicationAdvice": "<2-3 sentences of practical advice for applying to this specific offer>"
}

Scoring criteria:
- Role match with candidate's target roles (+25 pts)
- Skills alignment with offer requirements (+25 pts)
- Location/country match with target countries (+15 pts)
- Salary range within expectations (+10 pts)
- Remote type preference match (+10 pts)
- Seniority/experience fit (+10 pts)
- Sector alignment (+5 pts)${exclusionBlock}

Respond in ${languageName}.`,

    user: `## Job Offer
- **Title**: ${offer.title}
- **Location**: ${offer.location ?? 'Not specified'}
- **Remote**: ${offer.remoteType ?? 'Not specified'}
- **Salary**: ${formatSalary(offer.salaryMin, offer.salaryMax, offer.salaryCurrency)}
- **Description**${descriptionTruncated}: ${description}

## Candidate Profile
- **Skills**: ${profile.skills.join(', ') || 'Not specified'}
- **Experience**: ${profile.experienceYears} years
- **Target countries**: ${profile.targetCountries.join(', ') || 'Not specified'}
- **Target sectors**: ${profile.targetSectors.join(', ') || 'Not specified'}
- **Target roles**: ${profile.targetRoles.join(', ') || 'Not specified'}
${profile.cvSummary ? `- **CV summary**: ${profile.cvSummary}` : ''}

Evaluate the relevance of this job offer for this candidate.`,
  }
}

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null = ''
): string {
  if (min == null && max == null) return 'Not specified'
  const cur = currency ?? ''
  if (min != null && max != null) return `${min}-${max} ${cur}`.trim()
  if (min != null) return `From ${min} ${cur}`.trim()
  return `Up to ${max} ${cur}`.trim()
}

export function parseJobEvaluationResponse(raw: string): JobEvaluationResult | null {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return null
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])

    const relevanceScore =
      typeof parsed.relevanceScore === 'number'
        ? Math.min(100, Math.max(0, Math.round(parsed.relevanceScore)))
        : 0

    const matchSummary =
      typeof parsed.matchSummary === 'string' && parsed.matchSummary.length > 0
        ? parsed.matchSummary
        : 'Evaluation could not determine match quality.'

    const selectionReason =
      typeof parsed.selectionReason === 'string' && parsed.selectionReason.length > 0
        ? parsed.selectionReason
        : 'No specific selection reason provided.'

    const applicationAdvice =
      typeof parsed.applicationAdvice === 'string' && parsed.applicationAdvice.length > 0
        ? parsed.applicationAdvice
        : 'Review the offer details and tailor your application accordingly.'

    return { relevanceScore, matchSummary, selectionReason, applicationAdvice }
  } catch {
    return null
  }
}
