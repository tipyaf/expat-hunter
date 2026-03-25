import OpenRouterClient from '#ai/openrouter_client'
import CacheService from '#services/cache_service'

export type ChatMode = 'support' | 'expert' | 'mixed'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  mode?: ChatMode
}

export interface ChatContext {
  page: string // 'dashboard', 'emails', 'contacts', 'kanban', 'search', 'settings', 'other'
  contactId?: string
  companyName?: string
  country?: string
}

export interface ChatResponse {
  message: string
  mode: ChatMode
  actions?: { label: string; type: string; payload?: Record<string, unknown> }[]
  sources?: string[]
}

const MAX_MESSAGES_PER_SESSION = 50

const VISA_INFO: Record<string, string> = {
  NZ: 'New Zealand work visas: Skilled Migrant Category, Accredited Employer Work Visa (AEWV), Working Holiday. AEWV requires employer accreditation. Processing: 4-8 weeks.',
  AU: 'Australia work visas: Employer Nomination Scheme (186), Skilled Nominated (190), Temporary Skill Shortage (482). Requires skills assessment.',
  UK: 'UK work visas: Skilled Worker visa, requires sponsor license employer. Points-based system. Salary threshold: £26,200/year.',
  CA: 'Canada: Express Entry (Federal Skilled Worker), Provincial Nominee Programs. CRS score system.',
  US: 'USA: H-1B (specialty occupation), L-1 (intra-company transfer). Annual H-1B lottery in April.',
}

const MARKET_KEYWORDS = ['marché', 'market', 'salaire', 'salary', 'tendance', 'trend', 'secteur', 'sector']
const VISA_KEYWORDS = ['visa', 'immigration', 'sponsor', 'work permit', 'permis de travail', 'résidence']
const CAREER_KEYWORDS = ['cv', 'carrière', 'career', 'compétence', 'skill', 'positionnement', 'positioning', 'profil']

// In-memory session storage
const sessions = new Map<string, ChatMessage[]>()

const APP_FAQ = [
  {
    q: 'comment lancer une recherche',
    a: 'Allez dans **Recherche** (menu gauche), choisissez votre pays et secteur, puis cliquez sur "Lancer".',
  },
  {
    q: 'comment générer des emails',
    a: "Dans **Emails**, sélectionnez vos contacts et cliquez sur \"Générer\". Approuvez avant l'envoi.",
  },
  {
    q: 'comment envoyer des emails',
    a: 'Approuvez vos emails dans la page **Emails** puis utilisez "Envoyer la sélection".',
  },
  {
    q: 'comment modifier un template',
    a: 'Dans **Paramètres > Templates**, vous pouvez créer et modifier vos modèles d\'email.',
  },
  {
    q: 'comment bloquer une entreprise',
    a: 'Dans le **Kanban**, cliquez sur l\'icône bloquer sur une carte contact pour bloquer le contact ou son entreprise.',
  },
  {
    q: 'comment voir mes statistiques',
    a: 'Le **Dashboard** (page d\'accueil) affiche vos statistiques : contacts, emails envoyés, taux de réponse.',
  },
  {
    q: 'what is a preset',
    a: 'A **Preset** is a saved configuration for email generation (tone, length, language, custom instructions). Manage them in Settings > Presets.',
  },
  {
    q: 'how to track applications',
    a: 'The **Kanban** (Suivi) lets you track your applications through 6 stages: Found → To Contact → Contacted → Discussion → Interview → Done.',
  },
]

const SUPPORT_KEYWORDS = [
  'how',
  'comment',
  'où',
  'where',
  'aide',
  'help',
  'bug',
  'erreur',
  'error',
  'étapes',
  'steps',
  'lancer',
  'launch',
  'paramètre',
  'setting',
  'comment fonctionne',
  'how does',
  "qu'est-ce que",
]

const EXPERT_KEYWORDS = [
  'visa',
  'marché',
  'market',
  'salaire',
  'salary',
  'culture',
  'entreprise',
  'company',
  'sponsorise',
  'nz',
  'nouvelle-zélande',
  'new zealand',
  'embauche',
  'hiring',
  'délai',
  'delay',
  'entretien',
  'interview tips',
  'conseils carrière',
  'career',
  'cv',
]

function detectIntent(message: string): ChatMode {
  const lower = message.toLowerCase()
  const isSupport = SUPPORT_KEYWORDS.some((kw) => lower.includes(kw))
  const isExpert = EXPERT_KEYWORDS.some((kw) => lower.includes(kw))

  if (isSupport && isExpert) return 'mixed'
  if (isExpert) return 'expert'
  return 'support'
}

function findFaqMatch(message: string): string | null {
  const lower = message.toLowerCase()
  for (const item of APP_FAQ) {
    const qWords = item.q.split(' ')
    const matchCount = qWords.filter((word) => lower.includes(word)).length
    if (matchCount >= Math.max(2, Math.floor(qWords.length * 0.5))) {
      return item.a
    }
  }
  return null
}

function detectActions(
  message: string
): { label: string; type: string; payload?: Record<string, unknown> }[] {
  const lower = message.toLowerCase()
  const actions: { label: string; type: string; payload?: Record<string, unknown> }[] = []

  if (lower.includes('regenerate') || lower.includes('regénérer')) {
    actions.push({ label: 'Regénérer', type: 'regenerate_email' })
  }
  if (lower.includes('tone') || lower.includes('ton')) {
    actions.push({ label: 'Changer le ton', type: 'change_tone' })
  }

  return actions
}

export default class ChatAssistantService {
  private cacheService = new CacheService()

  getHistory(sessionId: string): ChatMessage[] {
    return sessions.get(sessionId) ?? []
  }

  private addToSession(sessionId: string, message: ChatMessage): void {
    const history = sessions.get(sessionId) ?? []
    history.push(message)
    // Trim to max
    if (history.length > MAX_MESSAGES_PER_SESSION) {
      history.splice(0, history.length - MAX_MESSAGES_PER_SESSION)
    }
    sessions.set(sessionId, history)
  }

  private async getSupportResponse(
    message: string,
    history: ChatMessage[]
  ): Promise<string> {
    // Try FAQ first
    const faqAnswer = findFaqMatch(message)
    if (faqAnswer) {
      return faqAnswer
    }

    // Try AI fallback
    let client: OpenRouterClient | null = null
    try {
      client = await OpenRouterClient.forFeature('chat_assistant')
    } catch {
      // DB or config error — skip AI fallback
    }
    if (client) {
      try {
        const systemPrompt = `Tu es l'assistant support d'ExpatHunter, une plateforme de recherche d'emploi à l'international.
Réponds en français de manière concise et utile. Aide l'utilisateur à utiliser l'application.
Si tu ne connais pas la réponse, dis-le honnêtement.

Fonctionnalités principales de l'app :
- Recherche : lancer des recherches de contacts (recruteurs, managers) par pays/secteur
- Contacts : liste des contacts trouvés avec enrichissement email
- Emails : génération et envoi d'emails de prospection personnalisés
- Kanban (Suivi) : suivi du pipeline de candidature (6 étapes)
- Dashboard : statistiques globales
- Paramètres : templates, presets de génération, paramètres d'envoi`

        const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
          { role: 'system', content: systemPrompt },
          ...history.slice(-10).map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          { role: 'user', content: message },
        ]

        return await client.chat({ messages, temperature: 0.5, maxTokens: 512 })
      } catch {
        // Fall through to default
      }
    }

    return "Je n'ai pas trouvé de réponse précise à votre question. Consultez la documentation ou contactez le support."
  }

  private async getExpertResponse(
    message: string,
    context: ChatContext,
    history: ChatMessage[],
    userProfile?: { cvText?: string; skills?: string[]; experienceYears?: number }
  ): Promise<string> {
    let client: OpenRouterClient | null = null
    try {
      client = await OpenRouterClient.forFeature('chat_assistant')
    } catch {
      // DB or config error — treat as unconfigured
    }
    if (!client) {
      return "L'assistant IA expert n'est pas configuré. Veuillez contacter l'administrateur pour activer cette fonctionnalité."
    }

    const lower = message.toLowerCase()

    // Gather context from cache
    let contextData = ''

    // F14.5: Inject market snapshot data when country is available
    if (context.country) {
      try {
        const marketCache = await this.cacheService.get<Record<string, unknown>>(
          'market',
          'market',
          context.country
        )
        if (marketCache) {
          contextData += `\nDonnées marché (${context.country}): ${JSON.stringify(marketCache.data).slice(0, 500)}`
        }
      } catch {
        // Ignore cache errors
      }
    }

    if (context.companyName) {
      try {
        const companyCache = await this.cacheService.get<Record<string, unknown>>(
          'enrichment',
          'company',
          context.companyName
        )
        if (companyCache) {
          contextData += `\nDonnées entreprise (${context.companyName}): ${JSON.stringify(companyCache.data).slice(0, 500)}`
        }
      } catch {
        // Ignore cache errors
      }
    }

    // F14.6: Inject visa info when visa keywords detected
    if (VISA_KEYWORDS.some((kw) => lower.includes(kw)) && context.country) {
      const visaInfo = VISA_INFO[context.country]
      if (visaInfo) {
        contextData += `\nInformations visa (${context.country}): ${visaInfo}`
      }
    }

    // F14.7: Inject user profile context when career/CV keywords detected
    let profileContext = ''
    if (userProfile && CAREER_KEYWORDS.some((kw) => lower.includes(kw))) {
      if (userProfile.cvText) {
        profileContext += `\nCV du candidat (extrait): ${userProfile.cvText.slice(0, 800)}`
      }
      if (userProfile.skills && userProfile.skills.length > 0) {
        profileContext += `\nCompétences: ${userProfile.skills.join(', ')}`
      }
      if (userProfile.experienceYears !== undefined) {
        profileContext += `\nAnnées d'expérience: ${userProfile.experienceYears}`
      }
    }

    const systemPrompt = `Tu es un expert en immigration professionnelle et recrutement international, spécialisé dans les marchés anglophones (Nouvelle-Zélande, Australie, Canada, UK).
Tu aides les utilisateurs d'ExpatHunter dans leur recherche d'emploi à l'international.
Réponds en français de manière précise, avec des conseils concrets et actionnables.
Page actuelle: ${context.page}${context.companyName ? `\nEntreprise: ${context.companyName}` : ''}${context.country ? `\nPays cible: ${context.country}` : ''}${contextData}${profileContext}`

    try {
      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: message },
      ]

      return await client.chat({ messages, temperature: 0.7, maxTokens: 768 })
    } catch {
      return "Une erreur est survenue lors de la consultation de l'assistant expert. Veuillez réessayer."
    }
  }

  async processMessage(
    userId: string,
    sessionId: string,
    message: string,
    context: ChatContext,
    userProfile?: { cvText?: string; skills?: string[]; experienceYears?: number }
  ): Promise<ChatResponse> {
    const history = this.getHistory(sessionId)
    const mode = detectIntent(message)

    // Add user message to history
    this.addToSession(sessionId, { role: 'user', content: message })

    let responseText: string

    if (mode === 'support') {
      responseText = await this.getSupportResponse(message, history)
    } else if (mode === 'expert') {
      responseText = await this.getExpertResponse(message, context, history, userProfile)
    } else {
      // mixed: try expert first, fall back to support
      responseText = await this.getExpertResponse(message, context, history, userProfile)
      // If expert returned the "not configured" message, try support instead
      if (responseText.includes("n'est pas configuré")) {
        responseText = await this.getSupportResponse(message, history)
      }
    }

    // Add assistant response to history
    this.addToSession(sessionId, { role: 'assistant', content: responseText, mode })

    // Detect actions from the original user message
    const actions = detectActions(message)

    return {
      message: responseText,
      mode,
      actions: actions.length > 0 ? actions : undefined,
    }
  }
}
