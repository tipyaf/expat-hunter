/**
 * Prompt template for CV skill extraction via OpenRouter.
 *
 * Returns a structured JSON with extracted skills, job titles, sectors and experience.
 */

export interface CvExtractionResult {
  skills: string[]
  suggestedRoles: string[]
  suggestedSectors: string[]
  experienceYears: number | null
  summary: string
}

export function buildCvExtractionPrompt(cvText: string): {
  system: string
  user: string
} {
  return {
    system: `Tu es un expert en recrutement international. Ton rôle est d'extraire des informations structurées à partir du texte brut d'un CV.

Réponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de commentaires) avec cette structure exacte :
{
  "skills": ["skill1", "skill2", ...],
  "suggestedRoles": ["role1", "role2", ...],
  "suggestedSectors": ["sector1", "sector2", ...],
  "experienceYears": <number or null>,
  "summary": "<résumé en 1-2 phrases du profil>"
}

Règles :
- "skills" : compétences techniques et métier (max 20, les plus pertinentes)
- "suggestedRoles" : postes probables pour ce candidat (max 5)
- "suggestedSectors" : secteurs d'activité adaptés (max 5)
- "experienceYears" : nombre d'années d'expérience estimé (null si impossible à déterminer)
- "summary" : résumé concis du profil professionnel
- Les skills doivent être normalisés (ex: "TypeScript" pas "typescript", "React" pas "reactjs")
- Pas de doublons dans aucune liste`,

    user: `Voici le texte brut extrait d'un CV. Extrais les informations structurées :

---
${cvText.slice(0, 4000)}
---`,
  }
}

export function parseCvExtractionResponse(raw: string): CvExtractionResult {
  // Strip markdown code fences if present
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const parsed = JSON.parse(cleaned)

  return {
    skills: Array.isArray(parsed.skills) ? parsed.skills.map(String) : [],
    suggestedRoles: Array.isArray(parsed.suggestedRoles)
      ? parsed.suggestedRoles.map(String)
      : [],
    suggestedSectors: Array.isArray(parsed.suggestedSectors)
      ? parsed.suggestedSectors.map(String)
      : [],
    experienceYears:
      typeof parsed.experienceYears === 'number' ? parsed.experienceYears : null,
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  }
}
