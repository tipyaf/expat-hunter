/**
 * Fuzzy-matching thresholds used across visa sponsor checks.
 *
 * Each threshold defines the minimum similarity score (0-1) required for a
 * match to be considered valid in a given context.
 */

/** Minimum score for NZ API results and H1BGrader HTML scraping */
export const FUZZY_THRESHOLD_NZ_API = 0.7

/** Default confidence when H1BGrader confirms sponsorship without a fuzzy match */
export const FUZZY_THRESHOLD_US_DEFAULT_CONFIDENCE = 0.75

/** Minimum score for local registry lookups (UK, AU, and fallback) */
export const FUZZY_THRESHOLD_REGISTRY = 0.85

/** Base similarity for full token overlap matches */
export const TOKEN_OVERLAP_BASE_SCORE = 0.85
/** Additional weight factor for token overlap length ratio */
export const TOKEN_OVERLAP_LENGTH_FACTOR = 0.1
