import Contact from '#models/contact'
import Company from '#models/company'
import type { ConfidenceFactor, ConfidenceResult } from './confidence_score_service.js'
import VisaSponsorRegistryService from './visa_sponsor_registry.js'

export interface ScoreSubScore {
  score: number
  maxScore: number
  explanation: string
}

export interface ExpatScoreBreakdown {
  visa: ScoreSubScore       // 0-25
  role: ScoreSubScore       // 0-30
  hiring: ScoreSubScore     // 0-20
  expatFriendly: ScoreSubScore // 0-15
  momentum: ScoreSubScore   // 0-10
}

export interface ExpatScoreResult extends ConfidenceResult {
  breakdown: ExpatScoreBreakdown
  version: 'expat_v2'
}

export default class ExpatScoringService {
  private readonly visaRegistry = new VisaSponsorRegistryService()

  async calculate(contact: Contact, company?: Company | null): Promise<ExpatScoreResult> {
    const comp = company ?? (contact.$preloaded?.company as Company | undefined) ?? null

    const visa = await this.scoreVisa(comp, contact.companyId)
    const role = this.scoreRole(contact)
    const hiring = this.scoreHiring(comp)
    const expatFriendly = this.scoreExpatFriendly(contact, comp)
    const momentum = this.scoreMomentum(comp)

    const breakdown: ExpatScoreBreakdown = { visa, role, hiring, expatFriendly, momentum }
    const total = visa.score + role.score + hiring.score + expatFriendly.score + momentum.score

    // Backwards-compatible factors for frontend (maps sub-scores to flat factors)
    const factors: ConfidenceFactor[] = [
      { label: visa.explanation, impact: visa.score > 0 ? 'positive' : 'negative', weight: visa.score },
      { label: role.explanation, impact: role.score > 15 ? 'positive' : role.score > 5 ? 'neutral' : 'negative', weight: role.score },
      { label: hiring.explanation, impact: hiring.score > 10 ? 'positive' : 'neutral', weight: hiring.score },
      { label: expatFriendly.explanation, impact: expatFriendly.score > 7 ? 'positive' : 'neutral', weight: expatFriendly.score },
      { label: momentum.explanation, impact: momentum.score > 5 ? 'positive' : 'neutral', weight: momentum.score },
    ]

    return { score: total, factors, breakdown, version: 'expat_v2' }
  }

  async calculateBatch(contacts: Contact[]): Promise<Map<string, ExpatScoreResult>> {
    const results = new Map<string, ExpatScoreResult>()
    // Process in batches of 10 to avoid overloading DB
    for (const contact of contacts) {
      results.set(contact.id, await this.calculate(contact))
    }
    return results
  }

  // ─── Sub-scores ─────────────────────────────────────────────────────────────

  private async scoreVisa(company: Company | null, companyId: string): Promise<ScoreSubScore> {
    if (!company) {
      return { score: 0, maxScore: 25, explanation: 'Données entreprise manquantes — statut visa inconnu' }
    }

    // Use cached visa status if available
    if (company.visaSponsorStatus === 'accredited') {
      const countries = company.visaSponsorCountries?.join(', ') ?? 'pays inconnu'
      return {
        score: 25,
        maxScore: 25,
        explanation: `Sponsor visa accrédité (${countries}) — peut recruter sans restriction`,
      }
    }

    if (company.visaSponsorStatus === 'not_found') {
      return {
        score: 5,
        maxScore: 25,
        explanation: 'Non trouvé dans les registres visa — peut nécessiter une vérification manuelle',
      }
    }

    // Unknown — do a live check if company name available
    if (company.name && company.country) {
      try {
        const check = await this.visaRegistry.checkCompany(company.name, company.country)
        if (check.isAccredited) {
          return {
            score: 25,
            maxScore: 25,
            explanation: `Sponsor visa accrédité (${check.visaTypes.join(', ')}) — peut recruter sans restriction`,
          }
        }
      } catch {
        // Fall through to unknown
      }
    }

    return {
      score: 8,
      maxScore: 25,
      explanation: 'Statut visa non vérifié — lancez une actualisation des registres',
    }
  }

  private scoreRole(contact: Contact): ScoreSubScore {
    if (!contact.role || contact.role.length < 3) {
      return { score: 0, maxScore: 30, explanation: 'Poste non identifié' }
    }

    // Use existing AI relevance score if available
    if (contact.relevanceScore !== null) {
      const normalized = Math.round((contact.relevanceScore / 100) * 30)
      const label = contact.relevanceLabel === 'very_relevant'
        ? 'Très pertinent selon l\'IA'
        : contact.relevanceLabel === 'relevant'
          ? 'Pertinent selon l\'IA'
          : 'Pertinence limitée selon l\'IA'
      return { score: normalized, maxScore: 30, explanation: `${label} — ${contact.role}` }
    }

    // Heuristic if no AI analysis: score based on role seniority keywords
    const role = contact.role.toLowerCase()
    const seniorKeywords = ['cto', 'ceo', 'director', 'head of', 'vp ', 'lead', 'manager', 'principal', 'founder']
    const midKeywords = ['engineer', 'developer', 'designer', 'product', 'analyst', 'architect']

    if (seniorKeywords.some((k) => role.includes(k))) {
      return { score: 22, maxScore: 30, explanation: `Décideur senior — ${contact.role}` }
    }
    if (midKeywords.some((k) => role.includes(k))) {
      return { score: 15, maxScore: 30, explanation: `Profil opérationnel — ${contact.role}` }
    }

    return { score: 8, maxScore: 30, explanation: `Poste identifié — ${contact.role}` }
  }

  private scoreHiring(company: Company | null): ScoreSubScore {
    if (!company) {
      return { score: 0, maxScore: 20, explanation: 'Intensité de recrutement inconnue' }
    }

    const intensity = company.hiringIntensity ?? 0

    if (intensity >= 5) {
      return { score: 20, maxScore: 20, explanation: `Recrutement actif — ${intensity} offres en cours` }
    }
    if (intensity >= 2) {
      return { score: 12, maxScore: 20, explanation: `Recrutement modéré — ${intensity} offres en cours` }
    }
    if (intensity === 1) {
      return { score: 6, maxScore: 20, explanation: '1 offre active — recrutement limité' }
    }

    // No intensity data but has website = some chance
    if (company.website) {
      return { score: 5, maxScore: 20, explanation: 'Intensité de recrutement non mesurée' }
    }

    return { score: 0, maxScore: 20, explanation: 'Aucune offre active détectée' }
  }

  private scoreExpatFriendly(contact: Contact, company: Company | null): ScoreSubScore {
    let score = 0
    const reasons: string[] = []

    // Email source from official page = company is reachable
    if (contact.emailSource === 'page') {
      score += 5
      reasons.push('contact trouvé sur le site officiel')
    }

    // Visa sponsor = automatically expat-friendly
    if (company?.visaSponsorStatus === 'accredited') {
      score += 8
      reasons.push('sponsor visa accrédité')
    }

    // Company has team page crawled = transparent culture
    if (company?.teamCrawledAt) {
      score += 2
      reasons.push('équipe visible en ligne')
    }

    // Signals from company data
    const signals = company?.signals as Record<string, unknown> | null
    if (signals?.expatFriendly) {
      score += 5
      reasons.push('signaux expat-friendly détectés')
    }

    score = Math.min(score, 15)

    if (score === 0) {
      return { score: 0, maxScore: 15, explanation: 'Aucun signal expat-friendly détecté' }
    }

    return {
      score,
      maxScore: 15,
      explanation: `Expat-friendly : ${reasons.join(', ')}`,
    }
  }

  private scoreMomentum(company: Company | null): ScoreSubScore {
    if (!company) {
      return { score: 0, maxScore: 10, explanation: 'Données entreprise manquantes' }
    }

    const signals = company.signals as Record<string, unknown> | null

    if (signals?.fundingDate) {
      const fundingDate = new Date(signals.fundingDate as string)
      const monthsAgo = (Date.now() - fundingDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      if (monthsAgo <= 6) {
        return { score: 10, maxScore: 10, explanation: 'Levée de fonds récente (< 6 mois) — croissance forte' }
      }
      if (monthsAgo <= 12) {
        return { score: 7, maxScore: 10, explanation: 'Levée de fonds il y a moins d\'un an' }
      }
    }

    if (signals?.isHiring) {
      return { score: 8, maxScore: 10, explanation: 'Signaux de croissance active détectés' }
    }

    if (company.hiringIntensity && company.hiringIntensity >= 3) {
      return { score: 6, maxScore: 10, explanation: 'Volume d\'offres élevé = entreprise en expansion' }
    }

    return { score: 3, maxScore: 10, explanation: 'Momentum non mesuré' }
  }
}
