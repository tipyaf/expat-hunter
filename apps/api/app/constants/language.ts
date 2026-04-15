/**
 * Country-to-language mapping for AI-generated documents.
 * Single source of truth for CV, cover letter, and application email language selection.
 * Maps ISO 3166-1 alpha-2 country codes to BCP 47 language tags.
 */
export const COUNTRY_LANGUAGE_MAP: Record<string, string> = {
  FR: 'fr',
  CA: 'en',
  CH: 'fr',
  BE: 'fr',
  AU: 'en',
  NZ: 'en',
  GB: 'en',
  SG: 'en',
  AE: 'en',
  DE: 'en',
  NL: 'en',
  JP: 'en',
}

export const DEFAULT_LANGUAGE = 'en'

/**
 * Deduce the document language from a list of target countries.
 * Falls back to English when no country or unknown country is provided.
 */
export function deduceLanguage(targetCountries: string[]): string {
  if (!targetCountries || targetCountries.length === 0) {
    return DEFAULT_LANGUAGE
  }
  return COUNTRY_LANGUAGE_MAP[targetCountries[0]] ?? DEFAULT_LANGUAGE
}
