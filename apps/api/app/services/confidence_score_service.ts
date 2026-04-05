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

    const scorers = [
      this.scoreEmail(contact),
      this.scoreRole(contact),
      this.scoreLinkedIn(contact),
      this.scoreAiAnalysis(contact),
      this.scoreCompanyData(contact, company),
    ]

    for (const result of scorers) {
      total += result.total
      maxPossible += result.maxPossible
      factors.push(...result.factors)
    }

    const score = maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0

    return { score, factors }
  }

  private scoreEmail(contact: Contact): { total: number; maxPossible: number; factors: ConfidenceFactor[] } {
    if (contact.email) {
      return { total: 30, maxPossible: 30, factors: [{ label: 'Email disponible', impact: 'positive', weight: 30 }] }
    }
    return { total: 0, maxPossible: 30, factors: [{ label: 'Pas d\'email', impact: 'negative', weight: 30 }] }
  }

  private scoreRole(contact: Contact): { total: number; maxPossible: number; factors: ConfidenceFactor[] } {
    if (contact.role && contact.role.length > 3) {
      return { total: 15, maxPossible: 15, factors: [{ label: 'Poste identifié', impact: 'positive', weight: 15 }] }
    }
    return { total: 0, maxPossible: 15, factors: [{ label: 'Poste non identifié', impact: 'negative', weight: 15 }] }
  }

  private scoreLinkedIn(contact: Contact): { total: number; maxPossible: number; factors: ConfidenceFactor[] } {
    if (contact.linkedinUrl) {
      return { total: 10, maxPossible: 10, factors: [{ label: 'Profil LinkedIn', impact: 'positive', weight: 10 }] }
    }
    return { total: 0, maxPossible: 10, factors: [{ label: 'Pas de profil LinkedIn', impact: 'neutral', weight: 10 }] }
  }

  private scoreAiAnalysis(contact: Contact): { total: number; maxPossible: number; factors: ConfidenceFactor[] } {
    if (contact.relevanceScore === null) {
      return { total: 0, maxPossible: 15, factors: [{ label: 'Pas encore analysé', impact: 'neutral', weight: 15 }] }
    }

    const factors: ConfidenceFactor[] = [{ label: 'Analyse IA effectuée', impact: 'positive', weight: 15 }]
    let total = 15
    let maxPossible = 15

    if (contact.relevanceLabel === 'very_relevant') {
      factors.push({ label: 'Très pertinent (IA)', impact: 'positive', weight: 5 })
      total += 5
      maxPossible += 5
    }

    return { total, maxPossible, factors }
  }

  private scoreCompanyData(contact: Contact, company?: Company | null): { total: number; maxPossible: number; factors: ConfidenceFactor[] } {
    const comp = company ?? (contact.$preloaded?.company as Company | undefined)
    if (!comp) {
      return { total: 0, maxPossible: 30, factors: [{ label: 'Données entreprise manquantes', impact: 'negative', weight: 30 }] }
    }

    const factors: ConfidenceFactor[] = []
    let total = 0
    let maxPossible = 0

    const checks: Array<{ condition: boolean; label: string; weight: number }> = [
      { condition: !!comp.website, label: 'Site web entreprise', weight: 10 },
      { condition: !!comp.sector, label: 'Secteur identifié', weight: 5 },
      { condition: !!comp.size, label: 'Taille entreprise connue', weight: 5 },
      { condition: !!comp.city, label: 'Ville identifiée', weight: 5 },
      { condition: !!(comp.signals && Object.keys(comp.signals).length > 0), label: 'Signaux entreprise détectés', weight: 5 },
    ]

    for (const check of checks) {
      maxPossible += check.weight
      if (check.condition) {
        factors.push({ label: check.label, impact: 'positive', weight: check.weight })
        total += check.weight
      }
    }

    return { total, maxPossible, factors }
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
