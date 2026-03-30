/**
 * Locale-to-language-name mapping.
 * Single source of truth for AI prompt locale instructions.
 * Used by TipsService, ChatAssistantService, and MarketSnapshotService.
 *
 * To add a new language: add one entry to this map — no other code changes required.
 */
export const LOCALE_NAMES: Record<string, string> = {
  fr: 'French',
  en: 'English',
}
