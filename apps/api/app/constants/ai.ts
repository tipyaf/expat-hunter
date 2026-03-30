/**
 * AI model configuration constants.
 * Centralizes temperature and token limits used across AI-powered services.
 */

/** Default temperature for factual, structured responses (support chat, reply suggestions). */
export const AI_TEMPERATURE_DEFAULT = 0.5

/** Higher temperature for creative, nuanced responses (expert advice, career coaching). */
export const AI_TEMPERATURE_CREATIVE = 0.7

/** Max tokens for short responses (support answers, context parsing, reply suggestions). */
export const AI_MAX_TOKENS_SHORT = 512

/** Max tokens for longer responses (expert advice, career coaching). */
export const AI_MAX_TOKENS_LONG = 768
