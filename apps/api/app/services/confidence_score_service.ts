import Contact from '#models/contact'
import Company from '#models/company'

export interface ConfidenceFactor {
  label: string
  impact: 'positive' | 'negative' | 'neutral'
  weight: number
}

export interface ConfidenceResult {
  score: number
  factors: ConfidenceFactor[]
}

export default class ConfidenceScoreService {
  /**
   * Calculate a confidence score (0-100) for a contact based on available data.
   */
  async calculate(contact: Contact, company?: Company | null): Promise<ConfidenceResult> {
    const factors: ConfidenceFactor[] = []
    let total = 0
    let maxPossible = 0

    // Email verified (30 points)
    maxPossible += 30
    if (contact.email) {
      factors.push({ label: 'Email disponible', impact: 'positive', weight: 30 })
      total += 30
    } else {
      factors.push({ label: 'Pas d\'email', impact: 'negative', weight: 30 })
    }

    // Role/title present (15 points)
    maxPossible += 15
    if (contact.role && contact.role.length > 3) {
      factors.push({ label: 'Poste identifié', impact: 'positive', weight: 15 })
      total += 15
    } else {
      factors.push({ label: 'Poste non identifié', impact: 'negative', weight: 15 })
    }

    // LinkedIn URL (10 points)
    maxPossible += 10
    if (contact.linkedinUrl) {
      factors.push({ label: 'Profil LinkedIn', impact: 'positive', weight: 10 })
      total += 10
    } else {
      factors.push({ label: 'Pas de profil LinkedIn', impact: 'neutral', weight: 10 })
    }

    // AI analysis done (15 points)
    maxPossible += 15
    if (contact.relevanceScore !== null) {
      factors.push({ label: 'Analyse IA effectuée', impact: 'positive', weight: 15 })
      total += 15
      // Bonus for high relevance (5 extra)
      if (contact.relevanceLabel === 'very_relevant') {
        factors.push({ label: 'Très pertinent (IA)', impact: 'positive', weight: 5 })
        total += 5
        maxPossible += 5
      }
    } else {
      factors.push({ label: 'Pas encore analysé', impact: 'neutral', weight: 15 })
    }

    // Company data quality (30 points total)
    const comp = company ?? (contact.$preloaded?.company as Company | undefined)
    if (comp) {
      // Company website (10 points)
      maxPossible += 10
      if (comp.website) {
        factors.push({ label: 'Site web entreprise', impact: 'positive', weight: 10 })
        total += 10
      }

      // Company sector (5 points)
      maxPossible += 5
      if (comp.sector) {
        factors.push({ label: 'Secteur identifié', impact: 'positive', weight: 5 })
        total += 5
      }

      // Company size (5 points)
      maxPossible += 5
      if (comp.size) {
        factors.push({ label: 'Taille entreprise connue', impact: 'positive', weight: 5 })
        total += 5
      }

      // Company city (5 points)
      maxPossible += 5
      if (comp.city) {
        factors.push({ label: 'Ville identifiée', impact: 'positive', weight: 5 })
        total += 5
      }

      // Company signals (5 points)
      maxPossible += 5
      if (comp.signals && Object.keys(comp.signals).length > 0) {
        factors.push({ label: 'Signaux entreprise détectés', impact: 'positive', weight: 5 })
        total += 5
      }
    } else {
      maxPossible += 30
      factors.push({ label: 'Données entreprise manquantes', impact: 'negative', weight: 30 })
    }

    const score = maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0

    return { score, factors }
  }

  /**
   * Batch calculate confidence scores for multiple contacts.
   */
  async calculateBatch(
    contacts: Contact[]
  ): Promise<Map<string, ConfidenceResult>> {
    const results = new Map<string, ConfidenceResult>()
    for (const contact of contacts) {
      const result = await this.calculate(contact)
      results.set(contact.id, result)
    }
    return results
  }
}
