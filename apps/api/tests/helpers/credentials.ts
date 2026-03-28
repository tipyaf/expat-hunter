/**
 * Centralized test credentials — read from environment variables.
 * Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.test.
 * Fallback values allow tests to run without .env.test (e.g. in CI).
 */
export const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'password123'
export const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL ?? 'profile-unit@example.com'

/**
 * Ensure the test user has premium plan. Call after login in tests
 * that need full access (pipeline, expert chat, etc.).
 */
export async function ensureTestUserPremium(userId: string): Promise<void> {
  const { default: User } = await import('#models/user')
  const user = await User.findOrFail(userId)
  if (user.plan !== 'premium') {
    user.plan = 'premium'
    await user.save()
  }
}
