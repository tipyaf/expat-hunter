/**
 * AnalysisService — Batch relevance analysis for contacts.
 *
 * Loads unanalyzed contacts, calls RelevanceAnalyzer for each,
 * persists scores, and updates contact statuses.
 */
import { RelevanceAnalyzer } from '#ai/relevance_analyzer'
import type { CandidateForAnalysis, ContactForAnalysis } from '#ai/prompts/relevance_analysis_prompt'
import Contact from '#models/contact'
import CandidateProfile from '#models/candidate_profile'
import logger from '@adonisjs/core/services/logger'

interface AnalysisRunResult {
  analyzed: number
  errors: number
  skipped: number
  contactIds: string[]
}

export default class AnalysisService {
  private analyzer: RelevanceAnalyzer

  constructor(analyzer?: RelevanceAnalyzer) {
    this.analyzer = analyzer ?? new RelevanceAnalyzer()
  }

  /**
   * Analyze all unanalyzed contacts for a given user.
   * Optionally filter by sourcing run.
   */
  async analyzeContacts(
    userId: string,
    options?: { sourcingRunId?: string; batchSize?: number }
  ): Promise<AnalysisRunResult> {
    if (!this.analyzer.isConfigured) {
      logger.warn('AnalysisService: OpenRouter not configured, skipping analysis')
      return { analyzed: 0, errors: 0, skipped: 0, contactIds: [] }
    }

    const profile = await CandidateProfile.query()
      .where('userId', userId)
      .first()

    const candidate = profile
      ? this.buildCandidateData(profile)
      : this.buildDefaultCandidateData(options?.sourcingRunId)

    if (!profile) {
      logger.info('AnalysisService: No candidate profile, using default analysis for user %s', userId)
    }
    const batchSize = options?.batchSize ?? 20

    const query = Contact.query()
      .where('userId', userId)
      .whereNull('relevanceScore')
      .where('userOverride', false)
      .preload('company')
      .limit(batchSize)

    if (options?.sourcingRunId) {
      query.where('sourcingRunId', options.sourcingRunId)
    }

    const contacts = await query

    if (contacts.length === 0) {
      return { analyzed: 0, errors: 0, skipped: 0, contactIds: [] }
    }

    const result: AnalysisRunResult = {
      analyzed: 0,
      errors: 0,
      skipped: 0,
      contactIds: [],
    }

    for (const contact of contacts) {
      if (!contact.company) {
        result.skipped++
        continue
      }

      try {
        const contactData = this.buildContactData(contact)
        const analysis = await this.analyzer.analyze(contactData, candidate)

        contact.relevanceScore = analysis.score
        contact.relevanceLabel = analysis.label
        contact.relevanceReason = analysis.reason
        contact.aiRecommendation = analysis.recommendation

        if (contact.status === 'identified') {
          contact.status = 'analyzed'
        }

        await contact.save()
        result.analyzed++
        result.contactIds.push(contact.id)

        logger.info(
          'Analyzed contact %s: score=%d label=%s rec=%s',
          contact.fullName,
          analysis.score,
          analysis.label,
          analysis.recommendation
        )
      } catch (err) {
        result.errors++
        logger.error('Failed to analyze contact %s: %s', contact.id, (err as Error).message)
      }
    }

    return result
  }

  /**
   * Re-analyze a single contact (e.g. after profile update).
   */
  async analyzeOne(contactId: string, userId: string): Promise<boolean> {
    if (!this.analyzer.isConfigured) return false

    const profile = await CandidateProfile.query()
      .where('userId', userId)
      .first()

    if (!profile) return false

    const contact = await Contact.query()
      .where('id', contactId)
      .where('userId', userId)
      .preload('company')
      .first()

    if (!contact || !contact.company) return false

    const candidate = this.buildCandidateData(profile)
    const contactData = this.buildContactData(contact)

    const analysis = await this.analyzer.analyze(contactData, candidate)

    contact.relevanceScore = analysis.score
    contact.relevanceLabel = analysis.label
    contact.relevanceReason = analysis.reason
    contact.aiRecommendation = analysis.recommendation

    if (contact.status === 'identified') {
      contact.status = 'analyzed'
    }

    await contact.save()
    return true
  }

  private buildCandidateData(profile: CandidateProfile): CandidateForAnalysis {
    return {
      skills: profile.skills ?? [],
      experienceYears: profile.experienceYears ?? 0,
      targetCountries: profile.targetCountries ?? [],
      targetSectors: profile.targetSectors ?? [],
      targetRoles: profile.targetRoles ?? [],
      cvSummary: null,
    }
  }

  /**
   * Build default candidate data when no profile exists.
   * Uses generic criteria to still score contacts meaningfully.
   */
  private buildDefaultCandidateData(_sourcingRunId?: string): CandidateForAnalysis {
    return {
      skills: ['technology', 'software', 'engineering'],
      experienceYears: 5,
      targetCountries: ['NZ', 'AU', 'UK'],
      targetSectors: ['technology', 'it', 'software'],
      targetRoles: ['developer', 'engineer', 'manager'],
      cvSummary: null,
    }
  }

  private buildContactData(contact: Contact): ContactForAnalysis {
    return {
      fullName: contact.fullName,
      role: contact.role,
      email: contact.email,
      linkedinUrl: contact.linkedinUrl,
      companyName: contact.company.name,
      companySector: contact.company.sector,
      companyCity: contact.company.city,
      companyCountry: contact.company.country,
      companyWebsite: contact.company.website,
      companySize: contact.company.size,
    }
  }
}
