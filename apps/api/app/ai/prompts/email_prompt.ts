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

const CULTURAL_CONVENTIONS: Record<string, string> = {
  NZ: 'Use a casual, direct tone. First-name basis is common. Keep it brief (5-7 sentences).',
  AU: 'Be friendly and informal. Australians value directness and brevity.',
  UK: "Be formal but not stiff. Use 'Dear [Name]' and maintain professional courtesy.",
  CA: 'Be warm but professional. Bilingual awareness if targeting Quebec.',
  US: 'Be confident and achievement-focused. Use action verbs.',
}

function getCulturalInstruction(country: string): string {
  const instruction = CULTURAL_CONVENTIONS[country]
  if (instruction) {
    return `\n- Cultural conventions for ${country}: ${instruction}`
  }
  return ''
}

export interface EmailGenerationResult {
  subject: string
  body: string
}

export interface EmailTemplatePattern {
  subjectPattern: string
  bodyPattern: string
}

export interface EmailPromptOptions {
  type?: 'initial' | 'follow_up_1' | 'follow_up_2' | 'follow_up_3'
  previousEmail?: string
  instructions?: string
  template?: EmailTemplatePattern
}

export function buildEmailPrompt(
  contact: ContactForEmail,
  candidate: CandidateForEmail,
  options?: EmailPromptOptions
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
- Le sujet doit être court et accrocheur (max 60 caractères)${getCulturalInstruction(contact.companyCountry)}
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
${options?.template ? `\n## Template à personnaliser\n**Sujet** : ${options.template.subjectPattern}\n**Corps** :\n${options.template.bodyPattern}` : ''}
${options?.instructions ? `\n## Instructions de l'utilisateur\n${options.instructions}` : ''}

${isFollowUp ? 'Rédige une relance courte et naturelle.' : options?.template ? 'Personnalise le template ci-dessus pour ce contact en adaptant le contenu à son profil et son entreprise.' : options?.instructions ? 'Améliore l\'email existant en suivant les instructions ci-dessus.' : 'Rédige un premier email de prise de contact.'}`,
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
