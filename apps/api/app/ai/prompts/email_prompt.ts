export interface ContactForEmail {
  fullName: string
  role: string
  companyName: string
  companySector: string | null
  companyCountry: string
  companyCity: string | null
}

export interface CandidateForEmail {
  fullName: string
  skills: string[]
  experienceYears: number
  targetRoles: string[]
  cvSummary: string | null
}

export interface EmailGenerationResult {
  subject: string
  body: string
}

export function buildEmailPrompt(
  contact: ContactForEmail,
  candidate: CandidateForEmail,
  options?: { type?: 'initial' | 'follow_up_1' | 'follow_up_2' | 'follow_up_3'; previousEmail?: string }
): { system: string; user: string } {
  const isFollowUp = options?.type && options.type !== 'initial'

  return {
    system: `Tu es un expert en prospection d'emploi à l'international. Tu rédiges des emails courts, humains et personnalisés pour des candidats qui contactent directement des responsables d'équipes opérationnelles (PAS les RH).

Règles strictes :
- L'email doit être en ANGLAIS (communication professionnelle internationale)
- Maximum 150 mots pour le corps de l'email
- Ton professionnel mais chaleureux, pas corporate
- Pas de formules génériques ("I hope this email finds you well", "Dear Sir/Madam")
- Mentionne le rôle du contact et son entreprise naturellement
- Mets en avant 2-3 compétences pertinentes du candidat par rapport au contexte
- Termine par une question ouverte ou une proposition concrète
- Le sujet doit être court et accrocheur (max 60 caractères)
${isFollowUp ? '- C\'est une RELANCE, sois plus bref et mentionne l\'email précédent' : ''}

Réponds UNIQUEMENT avec un objet JSON valide :
{
  "subject": "<sujet de l'email>",
  "body": "<corps de l'email>"
}`,

    user: `## Contact
- **Nom** : ${contact.fullName}
- **Rôle** : ${contact.role}
- **Entreprise** : ${contact.companyName}
- **Secteur** : ${contact.companySector ?? 'Non renseigné'}
- **Pays** : ${contact.companyCountry}
- **Ville** : ${contact.companyCity ?? 'Non renseignée'}

## Candidat
- **Nom** : ${candidate.fullName}
- **Compétences** : ${candidate.skills.join(', ') || 'Non renseignées'}
- **Expérience** : ${candidate.experienceYears} ans
- **Rôles visés** : ${candidate.targetRoles.join(', ') || 'Non renseignés'}
${candidate.cvSummary ? `- **Résumé** : ${candidate.cvSummary}` : ''}
${isFollowUp && options?.previousEmail ? `\n## Email précédent\n${options.previousEmail}` : ''}

${isFollowUp ? 'Rédige une relance courte et naturelle.' : 'Rédige un premier email de prise de contact.'}`,
  }
}

export function parseEmailResponse(raw: string): EmailGenerationResult {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`Failed to extract JSON from email response: ${cleaned.slice(0, 200)}`)
  }

  const parsed = JSON.parse(jsonMatch[0])

  return {
    subject: typeof parsed.subject === 'string' ? parsed.subject : 'Reaching out',
    body: typeof parsed.body === 'string' ? parsed.body : '',
  }
}
