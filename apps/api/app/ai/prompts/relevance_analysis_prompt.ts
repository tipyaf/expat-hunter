/**
 * Prompt template for contact relevance analysis via OpenRouter.
 *
 * Compares a contact+company against a candidate profile to produce
 * a relevance score, label, reason and recommendation.
 */

export interface RelevanceAnalysisResult {
  score: number
  label: 'very_relevant' | 'relevant' | 'to_review' | 'not_relevant'
  reason: string
  recommendation: 'contact' | 'skip' | 'manual_review'
}

export interface ContactForAnalysis {
  fullName: string
  role: string
  email: string | null
  linkedinUrl: string | null
  companyName: string
  companySector: string | null
  companyCity: string | null
  companyCountry: string
  companyWebsite: string | null
  companySize: string | null
}

export interface CandidateForAnalysis {
  skills: string[]
  experienceYears: number
  targetCountries: string[]
  targetSectors: string[]
  targetRoles: string[]
  cvSummary: string | null
}

export function buildRelevanceAnalysisPrompt(
  contact: ContactForAnalysis,
  candidate: CandidateForAnalysis
): { system: string; user: string } {
  return {
    system: `Tu es un expert en recrutement international et en recherche d'emploi pour expatriés.

Ton rôle : analyser si un contact professionnel est pertinent pour un candidat qui cherche du travail à l'étranger.

Le candidat ne contacte PAS les RH. Il cible les responsables d'équipes opérationnelles (CTO, VP Engineering, Team Lead, etc.) qui pourraient avoir des postes à pourvoir dans leur équipe.

Réponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de commentaires) :
{
  "score": <number 0-100>,
  "label": "<very_relevant|relevant|to_review|not_relevant>",
  "reason": "<explication courte en français, 1-2 phrases>",
  "recommendation": "<contact|skip|manual_review>"
}

Critères de scoring :
- Le contact a-t-il un rôle décisionnel (hiring manager, team lead, VP, director, CTO, etc.) ? (+30 pts)
- Le secteur de l'entreprise correspond-il aux secteurs cibles du candidat ? (+20 pts)
- Le pays correspond-il aux pays cibles du candidat ? (+15 pts)
- Le rôle du contact est-il en rapport avec les rôles cibles du candidat ? (+15 pts)
- L'entreprise semble-t-elle recruter (taille, secteur dynamique) ? (+10 pts)
- Le contact a-t-il un email ou LinkedIn pour être contacté ? (+10 pts)

Labels :
- score >= 75 → "very_relevant"
- score >= 50 → "relevant"
- score >= 30 → "to_review"
- score < 30 → "not_relevant"

Recommendations :
- "very_relevant" ou "relevant" → "contact"
- "to_review" → "manual_review"
- "not_relevant" → "skip"`,

    user: `## Contact à analyser
- **Nom** : ${contact.fullName}
- **Rôle** : ${contact.role}
- **Email** : ${contact.email ?? 'Non disponible'}
- **LinkedIn** : ${contact.linkedinUrl ?? 'Non disponible'}
- **Entreprise** : ${contact.companyName}
- **Secteur** : ${contact.companySector ?? 'Non renseigné'}
- **Ville** : ${contact.companyCity ?? 'Non renseignée'}
- **Pays** : ${contact.companyCountry}
- **Site web** : ${contact.companyWebsite ?? 'Non disponible'}
- **Taille** : ${contact.companySize ?? 'Non renseignée'}

## Profil du candidat
- **Compétences** : ${candidate.skills.join(', ') || 'Non renseignées'}
- **Expérience** : ${candidate.experienceYears} ans
- **Pays cibles** : ${candidate.targetCountries.join(', ') || 'Non renseignés'}
- **Secteurs cibles** : ${candidate.targetSectors.join(', ') || 'Non renseignés'}
- **Rôles cibles** : ${candidate.targetRoles.join(', ') || 'Non renseignés'}
${candidate.cvSummary ? `- **Résumé CV** : ${candidate.cvSummary}` : ''}

Analyse la pertinence de ce contact pour ce candidat.`,
  }
}

export function parseRelevanceAnalysisResponse(raw: string): RelevanceAnalysisResult {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`Failed to extract JSON from relevance response: ${cleaned.slice(0, 200)}`)
  }

  const parsed = JSON.parse(jsonMatch[0])

  const score = typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : 0

  const validLabels = ['very_relevant', 'relevant', 'to_review', 'not_relevant'] as const
  const label = validLabels.includes(parsed.label) ? parsed.label : deriveLabel(score)

  const validRecs = ['contact', 'skip', 'manual_review'] as const
  const recommendation = validRecs.includes(parsed.recommendation)
    ? parsed.recommendation
    : deriveRecommendation(label)

  return {
    score,
    label,
    reason: typeof parsed.reason === 'string' ? parsed.reason : 'Analyse non disponible',
    recommendation,
  }
}

function deriveLabel(score: number): RelevanceAnalysisResult['label'] {
  if (score >= 75) return 'very_relevant'
  if (score >= 50) return 'relevant'
  if (score >= 30) return 'to_review'
  return 'not_relevant'
}

function deriveRecommendation(label: RelevanceAnalysisResult['label']): RelevanceAnalysisResult['recommendation'] {
  if (label === 'very_relevant' || label === 'relevant') return 'contact'
  if (label === 'to_review') return 'manual_review'
  return 'skip'
}
