/**
 * Auth rate limiting and anti-bot constants.
 * All thresholds are named — no magic numbers in middleware or controllers.
 */

/** Max login attempts per IP per window */
export const LOGIN_RATE_LIMIT = 10

/** Login rate limit window in seconds (1 minute) */
export const LOGIN_RATE_WINDOW_SECONDS = 60

/** Max registration attempts per IP per window */
export const REGISTER_RATE_LIMIT = 5

/** Registration rate limit window in seconds (1 hour) */
export const REGISTER_RATE_WINDOW_SECONDS = 3600

/** Max forgot-password attempts per IP per window */
export const FORGOT_PASSWORD_RATE_LIMIT = 3

/** Forgot-password rate limit window in seconds (1 hour) */
export const FORGOT_PASSWORD_RATE_WINDOW_SECONDS = 3600

/** Max consecutive failed login attempts before account lockout */
export const MAX_FAILED_LOGINS = 5

/** Account lockout duration in minutes */
export const LOCKOUT_DURATION_MINUTES = 15

/** Redis key prefix for rate limiting */
export const RATE_LIMIT_PREFIX = 'rl:'

/** Redis key prefix for account lockout */
export const LOCKOUT_PREFIX = 'lockout:'
