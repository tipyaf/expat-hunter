import OpenRouterClient from '#ai/openrouter_client'
import CacheService from '#services/cache_service'
import { PLAN_PREMIUM } from '@expat-hunter/shared'
import type { UserPlan } from '@expat-hunter/shared'
import logger from '@adonisjs/core/services/logger'
import {
  AI_TEMPERATURE_DEFAULT,
  AI_TEMPERATURE_CREATIVE,
  AI_MAX_TOKENS_SHORT,
  AI_MAX_TOKENS_LONG,
} from '../constants/ai.js'
import { LOCALE_NAMES } from '../constants/locale.js'

const LOCALE_FALLBACK_LANGUAGE = 'French'

function getLanguageName(locale: string): string {
  return LOCALE_NAMES[locale?.trim().slice(0, 10) ?? ''] ?? LOCALE_FALLBACK_LANGUAGE
}

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
    a: 'Allez dans **[Recherche](/recherche)** (menu gauche), choisissez votre pays et secteur, puis cliquez sur "Lancer".',
  },
  {
    q: 'comment générer des emails',
    a: "Dans **[Emails](/emails)**, sélectionnez vos contacts et cliquez sur \"Générer\". Approuvez avant l'envoi.",
  },
  {
    q: 'comment envoyer des emails',
    a: 'Approuvez vos emails dans la page **[Emails](/emails)** puis utilisez "Envoyer la sélection".',
  },
  {
    q: 'comment modifier un template',
    a: 'Dans **[Paramètres > Templates](/parametres/templates)**, vous pouvez créer et modifier vos modèles d\'email.',
  },
  {
    q: 'comment bloquer une entreprise',
    a: 'Dans le **[Kanban](/suivi)**, cliquez sur l\'icône bloquer sur une carte contact pour bloquer le contact ou son entreprise.',
  },
  {
    q: 'comment voir mes statistiques',
    a: 'Le **[Dashboard](/)** (page d\'accueil) affiche vos statistiques : contacts, emails envoyés, taux de réponse.',
  },
  {
    q: 'what is a preset',
    a: 'A **Preset** is a saved configuration for email generation (tone, length, language, custom instructions). Manage them in **[Settings > Presets](/parametres/presets)**.',
  },
  {
    q: 'how to track applications',
    a: 'The **[Kanban](/suivi)** (Suivi) lets you track your applications through 6 stages: Found → To Contact → Contacted → Discussion → Interview → Done.',
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
    history: ChatMessage[],
    isPremium: boolean = true,
    locale: string = 'fr'
  ): Promise<string> {
    const languageName = getLanguageName(locale)
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
        const freeUserTone = !isPremium
          ? `\n\nIMPORTANT — Ton commercial subtil : L'utilisateur est en mode gratuit. De manière naturelle et discrète (pas à chaque réponse), mentionne les avantages Premium quand c'est pertinent. Par exemple : "Avec Premium, vous pourriez aussi bénéficier de l'analyse IA de pertinence" ou "Les membres Premium ont accès au suivi kanban complet". Ne sois jamais insistant ou agressif dans tes suggestions.`
          : ''

        const systemPrompt = `You are the ExpatHunter support assistant, a platform for international job search.
Respond concisely and helpfully. Help the user understand and use the application.
If you do not know the answer, say so honestly.
Respond in ${languageName}.

Main app features:
- Search: find contacts (recruiters, managers) by country and sector
- Contacts: list of found contacts with email enrichment
- Emails: generate and send personalised prospecting emails
- Kanban (Suivi): track your application pipeline (6 stages)
- Dashboard: global statistics
- Settings: email templates, generation presets, sending settings${freeUserTone}`

        const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
          { role: 'system', content: systemPrompt },
          ...history.slice(-10).map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          { role: 'user', content: message },
        ]

        return await client.chat({ messages, temperature: AI_TEMPERATURE_DEFAULT, maxTokens: AI_MAX_TOKENS_SHORT })
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
    userProfile?: { cvText?: string; skills?: string[]; experienceYears?: number },
    locale: string = 'fr'
  ): Promise<string> {
    const languageName = getLanguageName(locale)
    let client: OpenRouterClient | null = null
    try {
      client = await OpenRouterClient.forFeature('chat_assistant')
    } catch {
      // DB or config error — treat as unconfigured
    }
    if (!client) {
      logger.warn('OpenRouter unavailable for chat_assistant — falling back to support mode')
      try {
        return await this.getSupportResponse(message, history, true, locale)
      } catch {
        return 'The AI expert assistant is not configured. Please contact the administrator to enable this feature.'
      }
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
          contextData += `\nMarket data (${context.country}): ${JSON.stringify(marketCache.data).slice(0, 500)}`
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
          contextData += `\nCompany data (${context.companyName}): ${JSON.stringify(companyCache.data).slice(0, 500)}`
        }
      } catch {
        // Ignore cache errors
      }
    }

    // F14.6: Inject visa info when visa keywords detected
    if (VISA_KEYWORDS.some((kw) => lower.includes(kw)) && context.country) {
      const visaInfo = VISA_INFO[context.country]
      if (visaInfo) {
        contextData += `\nVisa information (${context.country}): ${visaInfo}`
      }
    }

    // F14.7: Inject user profile context when career/CV keywords detected
    let profileContext = ''
    if (userProfile && CAREER_KEYWORDS.some((kw) => lower.includes(kw))) {
      if (userProfile.cvText) {
        profileContext += `\nCandidate CV (excerpt): ${userProfile.cvText.slice(0, 800)}`
      }
      if (userProfile.skills && userProfile.skills.length > 0) {
        profileContext += `\nSkills: ${userProfile.skills.join(', ')}`
      }
      if (userProfile.experienceYears !== undefined) {
        profileContext += `\nYears of experience: ${userProfile.experienceYears}`
      }
    }

    const systemPrompt = `You are an expert in professional immigration and international recruitment, specialized in English-speaking markets (New Zealand, Australia, Canada, UK).
You help ExpatHunter users in their international job search.
Respond in ${languageName}. Be precise, concrete, and actionable.
Current page: ${context.page}${context.companyName ? `\nCompany: ${context.companyName}` : ''}${context.country ? `\nTarget country: ${context.country}` : ''}${contextData}${profileContext}`

    try {
      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: message },
      ]

      return await client.chat({ messages, temperature: AI_TEMPERATURE_CREATIVE, maxTokens: AI_MAX_TOKENS_LONG })
    } catch {
      return 'An error occurred while consulting the expert assistant. Please try again.'
    }
  }

  async processMessage(
    userId: string,
    sessionId: string,
    message: string,
    context: ChatContext,
    userProfile?: { cvText?: string; skills?: string[]; experienceYears?: number },
    plan?: UserPlan,
    locale: string = 'fr'
  ): Promise<ChatResponse> {
    const history = this.getHistory(sessionId)
    const mode = detectIntent(message)
    const isPremium = plan === PLAN_PREMIUM

    // Add user message to history
    this.addToSession(sessionId, { role: 'user', content: message })

    let responseText: string

    // Free users: only support mode allowed (app/support questions)
    if (!isPremium && (mode === 'expert' || mode === 'mixed')) {
      responseText = "Cette fonctionnalité est réservée aux membres Premium. En tant qu'utilisateur gratuit, je peux vous aider avec le fonctionnement de l'application et le support. Pour des conseils personnalisés sur votre recherche d'emploi, les visas ou le marché, passez à Premium !"
      this.addToSession(sessionId, { role: 'assistant', content: responseText, mode: 'support' })
      return { message: responseText, mode: 'support' }
    }

    if (mode === 'support') {
      responseText = await this.getSupportResponse(message, history, isPremium, locale)
    } else if (mode === 'expert') {
      responseText = await this.getExpertResponse(message, context, history, userProfile, locale)
    } else {
      // mixed: try expert first, fall back to support
      responseText = await this.getExpertResponse(message, context, history, userProfile, locale)
      // If expert returned the "not configured" message, try support instead
      if (responseText.includes('is not configured')) {
        responseText = await this.getSupportResponse(message, history, isPremium, locale)
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
