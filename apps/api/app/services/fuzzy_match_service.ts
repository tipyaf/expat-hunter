/**
 * FuzzyMatchService — Company name normalization and fuzzy matching.
 *
 * Extracted from VisaSponsorRegistryService to keep each module focused
 * and under the 400-line limit.
 */

import { TOKEN_OVERLAP_BASE_SCORE, TOKEN_OVERLAP_LENGTH_FACTOR } from '../constants/scoring.js'

/** Legal suffixes stripped during normalization */
const LEGAL_SUFFIXES =
  /\b(limited|ltd|pty|pty\s+ltd|inc|incorporated|corporation|corp|gmbh|sas|sarl|llc|plc|co\.|company|group|holdings|international|intl)\b\.?/gi

export default class FuzzyMatchService {
  /**
   * Normalize a company name for comparison: lowercase, strip legal suffixes,
   * remove punctuation and collapse whitespace.
   */
  normalizeCompanyName(name: string): string {
    return name
      .toLowerCase()
      .replace(LEGAL_SUFFIXES, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Smart fuzzy matching combining substring containment, token overlap, and Levenshtein.
   * Returns 0 (no match) to 1 (exact match).
   *
   * Handles cases like "datacom" vs "datacom connect" (substring -> 0.95)
   * or "vista group" vs "vista group nz" (token overlap -> 0.90).
   */
  fuzzyMatch(a: string, b: string): number {
    if (a === b) return 1
    if (!a || !b) return 0

    // Substring containment: if search term is fully contained in result, high score
    if (b.includes(a)) return 0.9 + 0.1 * (a.length / b.length)
    if (a.includes(b)) return 0.9 + 0.1 * (b.length / a.length)

    // Token overlap: check if all words of the shorter are in the longer
    const aWords = a.split(/\s+/)
    const bWords = b.split(/\s+/)
    const [shorter, longer] = aWords.length <= bWords.length ? [aWords, bWords] : [bWords, aWords]
    const matchedTokens = shorter.filter((w) => longer.some((lw) => lw === w || lw.startsWith(w)))
    if (matchedTokens.length === shorter.length && shorter.length > 0) {
      return TOKEN_OVERLAP_BASE_SCORE + TOKEN_OVERLAP_LENGTH_FACTOR * (shorter.length / longer.length)
    }

    // Fallback to Levenshtein
    const maxLen = Math.max(a.length, b.length)
    if (maxLen === 0) return 1

    const distance = this.levenshtein(a, b)
    return 1 - distance / maxLen
  }

  /**
   * Levenshtein edit distance between two strings.
   */
  levenshtein(a: string, b: string): number {
    const m = a.length
    const n = b.length
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    )

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1]
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
        }
      }
    }

    return dp[m][n]
  }
}
