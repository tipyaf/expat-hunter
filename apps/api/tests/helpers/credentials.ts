/**
 * Centralized test credentials — read from environment variables.
 * Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.test.
 * Fallback values allow tests to run without .env.test (e.g. in CI).
 */
export const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'password123'
export const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL ?? 'profile-unit@example.com'
