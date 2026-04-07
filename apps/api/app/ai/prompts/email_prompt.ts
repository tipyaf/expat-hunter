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

export interface PresetPromptOptions {
  tone?: string
  length?: 'short' | 'medium' | 'long'
  framework?: 'aida' | 'pas' | 'bab' | 'direct'
  language?: string
  customInstructions?: string
}

export interface EmailPromptOptions {
  type?: 'initial' | 'follow_up_1' | 'follow_up_2' | 'follow_up_3'
  previousEmail?: string
  instructions?: string
  template?: EmailTemplatePattern
  preset?: PresetPromptOptions
}

const LENGTH_CONSTRAINTS: Record<string, string> = {
  short: '80 mots maximum',
  medium: '150 mots maximum',
  long: '250 mots maximum',
}

const FRAMEWORK_INSTRUCTIONS: Record<string, string> = {
  aida: "Structure l'email selon le framework AIDA : Attention (accroche), Interest (intérêt), Desire (envie), Action (call-to-action).",
  pas: "Structure l'email selon le framework PAS : Problem (problème identifié), Agitate (amplification), Solution (proposition).",
  bab: "Structure l'email selon le framework BAB : Before (situation actuelle), After (vision idéale), Bridge (comment y arriver).",
  direct: '',
}

function buildToneInstruction(preset?: PresetPromptOptions): string {
  if (!preset?.tone || preset.tone === 'professional') {
    return 'Ton professionnel mais chaleureux, pas corporate'
  }
  const toneMap: Record<string, string> = {
    friendly: 'Ton amical et décontracté, comme un message entre collègues',
    direct: 'Ton direct et concis, va droit au but sans fioritures',
    enthusiastic: 'Ton enthousiaste et énergique, montre de la passion',
  }
  return toneMap[preset.tone] ?? `Ton ${preset.tone}`
}

function buildSystemRules(
  preset: PresetPromptOptions | undefined,
  isFollowUp: boolean,
  country: string
): string {
  const lengthConstraint = LENGTH_CONSTRAINTS[preset?.length ?? 'medium'] ?? LENGTH_CONSTRAINTS.medium
  const toneInstruction = buildToneInstruction(preset)
  const frameworkInstruction = FRAMEWORK_INSTRUCTIONS[preset?.framework ?? 'direct'] ?? ''
  const emailLanguage = preset?.language === 'fr' ? 'FRANÇAIS' : 'ANGLAIS'

  const rules = [
    `- L'email doit être en ${emailLanguage} (communication professionnelle internationale)`,
    `- ${lengthConstraint} pour le corps de l'email`,
    `- ${toneInstruction}`,
    '- Pas de formules génériques ("I hope this email finds you well", "Dear Sir/Madam")',
    '- Mentionne le rôle du contact et son entreprise naturellement',
    '- Mets en avant 2-3 compétences pertinentes du candidat par rapport au contexte',
    '- Termine par une question ouverte ou une proposition concrète',
    `- Le sujet doit être court et accrocheur (max 60 caractères)${getCulturalInstruction(country)}`,
  ]

  if (isFollowUp) {
    rules.push("- C'est une RELANCE, sois plus bref et mentionne l'email précédent")
  }
  if (frameworkInstruction) {
    rules.push(`- ${frameworkInstruction}`)
  }
  if (preset?.customInstructions) {
    rules.push(`- Instructions supplémentaires : ${preset.customInstructions}`)
  }

  return rules.join('\n')
}

function buildUserClosingInstruction(isFollowUp: boolean, options?: EmailPromptOptions): string {
  if (isFollowUp) {
    return 'Rédige une relance courte et naturelle.'
  }
  if (options?.template) {
    return 'Personnalise le template ci-dessus pour ce contact en adaptant le contenu à son profil et son entreprise.'
  }
  if (options?.instructions) {
    return "Améliore l'email existant en suivant les instructions ci-dessus."
  }
  return 'Rédige un premier email de prise de contact.'
}

function buildUserContextSections(
  isFollowUp: boolean,
  options?: EmailPromptOptions
): string {
  const sections: string[] = []

  if (isFollowUp && options?.previousEmail) {
    sections.push(`\n## Email précédent\n${options.previousEmail}`)
  }
  if (options?.template) {
    sections.push(`\n## Template à personnaliser\n**Sujet** : ${options.template.subjectPattern}\n**Corps** :\n${options.template.bodyPattern}`)
  }
  if (options?.instructions) {
    sections.push(`\n## Instructions de l'utilisateur\n${options.instructions}`)
  }

  return sections.join('\n')
}

export function buildEmailPrompt(
  contact: ContactForEmail,
  candidate: CandidateForEmail,
  options?: EmailPromptOptions
): { system: string; user: string } {
  const isFollowUp = options?.type !== undefined && options.type !== 'initial'
  const preset = options?.preset
  const systemRules = buildSystemRules(preset, isFollowUp, contact.companyCountry)

  return {
    system: `Tu es un expert en prospection d'emploi à l'international. Tu rédiges des emails courts, humains et personnalisés pour des candidats qui contactent directement des responsables d'équipes opérationnelles (PAS les RH).

Règles strictes :
${systemRules}

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
${buildUserContextSections(isFollowUp, options)}

${buildUserClosingInstruction(isFollowUp, options)}`,
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
