/**
 * TipsService — Generates contextual, locale-aware tips via OpenRouter AI.
 *
 * Tips are cached 30 days per {page}::{locale}::{contextHash}.
 * Falls back to static French strings when OpenRouter is unavailable.
 */
import { createHash } from 'node:crypto'
import OpenRouterClient from '#ai/openrouter_client'
import CacheService from '#services/cache_service'
import type { DashboardStats } from '#services/dashboard_service'
import logger from '@adonisjs/core/services/logger'
import { LOCALE_NAMES } from '../constants/locale.js'
import { AI_TEMPERATURE_DEFAULT, AI_MAX_TOKENS_SHORT } from '../constants/ai.js'

export interface ContextualTip {
  message: string
  cta?: { label: string; href: string }
}

export type OpenRouterFactory = (feature: string) => Promise<OpenRouterClient | null>

const TIPS_SYSTEM_PROMPT =
  'You are a career coaching assistant for ExpatHunter. Generate ONE short tip (max 2 sentences). Be specific, actionable, and encouraging.'

const CACHE_SOURCE = 'tips'
const TIPS_TTL_DAYS = 30
const LOCALE_FALLBACK = 'French'
const LOCALE_MAX_LENGTH = 10

// ─── Pure helper functions (exported for testing) ─────────────────────────────

export function sanitizeLocale(locale: string): string {
  return locale.trim().slice(0, LOCALE_MAX_LENGTH).replace(/[^a-zA-Z0-9-]/g, '')
}

export function buildContextHash(context: Record<string, unknown>): string {
  const sorted = Object.fromEntries(Object.entries(context).sort())
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex').slice(0, 16)
}

function getLanguageName(locale: string): string {
  const sanitized = sanitizeLocale(locale)
  return LOCALE_NAMES[sanitized] ?? LOCALE_FALLBACK
}

// ─── Static fallback tips (French — used when OpenRouter is unavailable) ──────

const STATIC_TIPS: Record<string, ContextualTip> = {
  dashboard: {
    message: "Complétez votre profil pour que l'IA trouve les contacts les plus pertinents.",
    cta: { label: 'Compléter mon profil', href: '/profil' },
  },
  thread: {
    message: 'Répondez rapidement aux réponses reçues (idéalement sous 24h).',
  },
  profile: {
    message: 'Un profil complet améliore la pertinence des emails générés.',
    cta: { label: 'Compléter mon profil', href: '/profil' },
  },
  kanban: {
    message: 'Gardez votre pipeline à jour. Un contact sans réponse après 7 jours mérite une relance.',
  },
}

// ─── Service ─────────────────────────────────────────────────────────────────

export default class TipsService {
  private cacheService: CacheService
  private openRouterFactory: OpenRouterFactory

  constructor(cacheService?: CacheService, openRouterFactory?: OpenRouterFactory) {
    this.cacheService = cacheService ?? new CacheService()
    this.openRouterFactory =
      openRouterFactory ?? ((f) => OpenRouterClient.forFeature(f as Parameters<typeof OpenRouterClient.forFeature>[0]))
  }

  private async generateTip(
    page: string,
    contextHash: string,
    locale: string,
    userPrompt: string,
    fallback: ContextualTip
  ): Promise<ContextualTip> {
    const languageName = getLanguageName(locale)
    const cacheKey = `${page}::${sanitizeLocale(locale)}::${contextHash}`

    const result = await this.cacheService.getOrFetch(
      CACHE_SOURCE,
      'tip',
      cacheKey,
      async () => {
        let client: OpenRouterClient | null = null
        try {
          client = await this.openRouterFactory('chat_assistant')
        } catch {
          // DB or config error — no client
        }

        if (!client) {
          logger.warn({ page, locale }, 'OpenRouter unavailable for tips — using static fallback')
          return fallback as unknown as Record<string, unknown>
        }

        try {
          const messages: { role: 'system' | 'user'; content: string }[] = [
            { role: 'system', content: `${TIPS_SYSTEM_PROMPT} Respond in ${languageName}.` },
            { role: 'user', content: userPrompt },
          ]
          const message = await client.chat({
            messages,
            temperature: AI_TEMPERATURE_DEFAULT,
            maxTokens: AI_MAX_TOKENS_SHORT,
          })
          return { message, cta: fallback.cta } as unknown as Record<string, unknown>
        } catch {
          logger.warn({ page, locale }, 'OpenRouter error for tips — using static fallback')
          return fallback as unknown as Record<string, unknown>
        }
      },
      TIPS_TTL_DAYS
    )

    return result.data as unknown as ContextualTip
  }

  async getDashboardTip(stats: DashboardStats, locale: string): Promise<ContextualTip> {
    const context = {
      contacts: stats.contacts,
      emailsSent: stats.emailsSent,
      responseRate: stats.responseRate,
      replies: stats.replies,
      interviews: stats.interviews,
    }
    const contextHash = buildContextHash(context as unknown as Record<string, unknown>)

    let prompt: string
    let fallback: ContextualTip

    if (stats.contacts === 0) {
      prompt = 'New user with no contacts yet. Give one onboarding tip to get started with ExpatHunter.'
      fallback = {
        message:
          "Commencez par compléter votre profil pour que l'IA puisse trouver les contacts les plus pertinents.",
        cta: { label: 'Compléter mon profil', href: '/profil' },
      }
    } else if (stats.emailsSent === 0) {
      prompt = `User has ${stats.contacts} contacts but no emails sent yet. Encourage them to generate and send their first prospecting emails.`
      fallback = {
        message: `Vous avez ${stats.contacts} contact(s) identifié(s). Générez et envoyez vos premiers emails pour démarrer votre prospection.`,
        cta: { label: 'Voir mes emails', href: '/emails' },
      }
    } else if (stats.interviews > 0) {
      prompt = `User has ${stats.interviews} ongoing interview(s). Give advice on preparation and cultural fit for international job search.`
      fallback = {
        message: `🎉 Félicitations ! Vous avez ${stats.interviews} entretien(s) en cours. Préparez-vous sur la culture locale et les attentes du marché.`,
        cta: { label: 'Voir le suivi', href: '/suivi' },
      }
    } else {
      prompt = `User stats: ${stats.contacts} contacts, ${stats.emailsSent} emails sent, ${stats.responseRate}% response rate, ${stats.replies} replies. Give one actionable tip to improve their international job search.`
      fallback = STATIC_TIPS.dashboard
    }

    return this.generateTip('dashboard', contextHash, locale, prompt, fallback)
  }

  async getThreadTip(
    contactId?: string,
    country?: string,
    locale?: string
  ): Promise<ContextualTip> {
    const safeLocale = locale ?? 'fr'
    const context = { contactId: contactId ?? null, country: country ?? null }
    const contextHash = buildContextHash(context as unknown as Record<string, unknown>)

    const countryLine = country ? ` in ${country}` : ''
    const prompt = `User is viewing an email exchange with a contact${countryLine}. Give one tip about follow-up timing and email tone for international job search.`
    const fallback: ContextualTip = STATIC_TIPS.thread

    return this.generateTip('thread', contextHash, safeLocale, prompt, fallback)
  }

  async getProfileTip(
    profile: { skills: string[]; experienceYears: number; targetCountries: string[] },
    locale?: string
  ): Promise<ContextualTip> {
    const safeLocale = locale ?? 'fr'
    const context = {
      skillsCount: profile.skills.length,
      experienceYears: profile.experienceYears,
      targetCountries: profile.targetCountries.join(','),
    }
    const contextHash = buildContextHash(context as unknown as Record<string, unknown>)

    const prompt = `User profile: ${profile.experienceYears} years experience, ${profile.skills.length} skills, targeting ${profile.targetCountries.join(', ')}. Give one tip to improve their ExpatHunter profile for better job matches.`
    const fallback: ContextualTip =
      profile.skills.length < 3
        ? { message: 'Ajoutez plus de compétences à votre profil pour améliorer vos chances.', cta: { label: 'Mettre à jour', href: '/profil' } }
        : STATIC_TIPS.profile

    return this.generateTip('profile', contextHash, safeLocale, prompt, fallback)
  }

  async getKanbanTip(status: string | null, locale?: string): Promise<ContextualTip> {
    const safeLocale = locale ?? 'fr'
    const context = { status: status ?? 'default' }
    const contextHash = buildContextHash(context as unknown as Record<string, unknown>)

    const PROMPT_BY_STATUS: Record<string, string> = {
      interview: 'User has an ongoing interview. Give advice on preparation and cultural fit.',
      replied: 'User received a reply. Give advice on responding quickly and personally.',
      rejected: 'User was rejected. Give encouraging advice to continue their search.',
    }
    const prompt =
      PROMPT_BY_STATUS[status ?? ''] ??
      'User is viewing their job search pipeline. Give a tip to keep their pipeline up to date.'
    const fallback: ContextualTip = STATIC_TIPS.kanban

    return this.generateTip('kanban', contextHash, safeLocale, prompt, fallback)
  }
}
